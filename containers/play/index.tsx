import { type KeyboardEvent, type MouseEvent, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/router'
import { playDrawer } from 'libs/redux/slices/navbar'
import { useDeleteApiLessonNotesByIdMutation, useGetApiCoursesByIdQuery, useGetApiLessonNotesQuery, usePostApiLessonNotesMutation } from 'libs/redux/services/karnama'
import { Box, Drawer, Button, Divider, IconButton, Paper, Chip, Breadcrumbs, Link, Typography, CircularProgress } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'; // Importing the Delete Icon
import CheckOutlined from '@mui/icons-material/CheckOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Down arrow
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'; // Left arrow
import VideoJS from 'components/videoPlayer'
import ButtonComponent from 'components/ui/Button'
import Row from 'components/ui/Row'
import cn from 'classnames'

import { MDXEditor, UndoRedo, ListsToggle, BoldItalicUnderlineToggles, toolbarPlugin, listsPlugin } from '@mdxeditor/editor'
import Markdown from 'react-markdown'
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx';
import he from 'he'; // Import he for HTML entities decoding

import '@mdxeditor/editor/style.css'
import type { Lesson, Section } from 'libs/redux/services/karnama'
import type { RootState } from 'libs/redux/store'
import styles from './play.module.scss'
import { tovToString } from 'utils/helpers/formatTime'


function PlayComponent() {
  const isProd = process.env.NODE_ENV === 'production'
  const { accessToken } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()
  const { query, push } = useRouter()
  const [selectedLesson, setSelectedLesson] = useState<Lesson>({})
  const [selectedSection, setSelectedSection] = useState<Section>({})
  const [changeCurrentTime, setChangeCurrentTime] = useState(-1)
  const [showNewUGQ, setShowNewUGQ] = useState(false)

  const { playDrawerStatus } = useSelector((state: RootState) => state.navbar)
  const lessonId = Number(query.slug?.[1])
  const { data } = useGetApiCoursesByIdQuery({ id: Number(query.slug?.[0]) }, {
    refetchOnMountOrArgChange: false,
    skip: !query.slug?.[0],
    refetchOnReconnect: false,
    refetchOnFocus: false
  })
  const [saveNewNote, { isLoading }] = usePostApiLessonNotesMutation()
  const [deleteNote, { isLoading: deleteLoading }] = useDeleteApiLessonNotesByIdMutation()
  const { data: notes, refetch } = useGetApiLessonNotesQuery({ lessonId },{ skip: !accessToken })

  const [toV, setToV] = useState(0)
  const [showNewNote, setShowNewNote] = useState(false)
  const [openSections, setOpenSections] = useState<{ [key: number]: boolean }>({});
  const ref = useRef<MDXEditorMethods>(null)
  const sectionsData = data?.sections

const getNextLesson = (): string | null => {
  if (!data?.sections || !selectedLesson.id) return null;

  let foundCurrent = false;
  
  // Iterate through all sections
  for (const section of data.sections) {
    if (!section.lessons) continue;
    
    // Iterate through lessons in current section
    for (let i = 0; i < section.lessons.length; i++) {
        if (foundCurrent && section.lessons[i]) {
         return `/play/${data.id}/${section.lessons[i].id}/${section.lessons[i].title}`;
      }
      // Mark when we find current lesson
      if (section.lessons[i].id === selectedLesson.id)
        foundCurrent = true;
    }
    
  }

  return null; // Return null if no next lesson found
};

  const handleNewUGQ = () => {
    const url = `/dashboard/UGQ/${lessonId}?tov=${toV}`
    window.open(url, "_blank", "noreferrer");
  }

  const toggleSection = (id: number) => {
    setOpenSections(prevState => ({
      ...prevState,
      [id]: !prevState[id],
    }));
  };
  const onTimeChange = useMemo(() => (t: number) => setToV(+t?.toFixed(0)), []);
  const deleteNoteHandler = (id: number) => {
    deleteNote({ id }).then(() => {
      refetch()
    })
  }
  const saveNewNoteHandler = () => {
    saveNewNote({ lessonNote: { lessonId, text: ref.current.getMarkdown(), toV } }).then(() => {
      ref.current.setMarkdown('')
      refetch()
      setShowNewNote(false)

    })

  }
  const findLessonHandler = () => {
    if (
      query.slug?.[1] === '1' &&
      data &&
      data.sections &&
      data.sections.length > 0 &&
      data.sections[0].lessons &&
      data.sections[0].lessons.length > 0
    ) {
      push(`/play/${data.id}/${data.sections[0].lessons[0].id}/${data.sections[0].lessons[0].title}/`)
      setSelectedLesson(data.sections[0].lessons[0])
      setSelectedSection(data.sections[0])

      return
    }

    data?.sections?.forEach((section) => {
      section?.lessons?.forEach((lesson) => {
        if (lesson.id === Number(query.slug?.[1])) {
          setSelectedLesson(lesson)
          setSelectedSection(section)
        }
      })
    })
    setOpenSections(data?.sections?.reduce((acc: { [key: number]: boolean }, section) => {
      acc[section.id as number] = true;
      return acc;
    }, {}) as { [key: number]: boolean })
  }

  useEffect(() => {
    ref.current?.focus()
  }, [ref.current])
  useEffect(() => {
    if (data) findLessonHandler()
  }, [data, query])

  const selectCourseHandler = (lesson: Lesson) => {
    dispatch(playDrawer(false))
    push(`/play/${data?.id}/${lesson?.id}/${lesson.title}`)


  }

  const toggleDrawer =
    (open: boolean) => (event: KeyboardEvent | MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ((event as KeyboardEvent).key === 'Tab' ||
          (event as KeyboardEvent).key === 'Shift')
      ) {
        return
      }

      dispatch(playDrawer(open))
    }

  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
  const fileExtension = '.xlsx';
  const fileName = `یادداشتهای ${data?.titleFa} - ${selectedLesson.title}`;
  const sheetName = 'Sheet1';
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  const exportToExcel = () => {
    // Format data into a worksheet
    if (!notes) return
    console.log(notes)
    const formattedData = notes.map(({ toV, text }) => ({ Time: formatTime(toV), Text: he.decode(text) }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = { Sheets: { [sheetName]: ws }, SheetNames: [sheetName] };

    // Convert the workbook to an Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Save the file using FileSaver.js
    const excelBlob = new Blob([excelBuffer], { type: fileType });
    FileSaver.saveAs(excelBlob, fileName + fileExtension);
  };

  const list = () => (
    <Box
      sx={{ width: "100%" }}
      role='presentation'
    >
      {sectionsData?.map((section, index) => (
        <Row
          className='mx-1 my-1'
          direction='column'
          justify='space-between'
          style={{ borderBottom: '1px solid rgba(255,255,255,.35)' }}
        >
          <Row
            onClick={() => toggleSection(section.id as number)}
            className='mx-0 my-0'
            direction='row'
            justify='space-between'
            style={{ cursor: 'pointer' }}

          >
            <span className={styles['play__lesson--title']}>{section.title}</span>

            <IconButton >
              {openSections[section.id as number] ? <ChevronLeftIcon htmlColor="#ffffff" /> : <ExpandMoreIcon htmlColor="#ffffff" />}
            </IconButton>


          </Row>

          {openSections[section.id as number] && section?.lessons?.map((lesson) => (
            <ButtonComponent
              className={cn(
                styles['play__lesson'],
                lesson.id === selectedLesson.id &&
                styles['play__lesson--active']
              )}
              onClick={() => selectCourseHandler(lesson)}
            >
              <span className={styles['play--titleSection']}>
                {!!lesson?.userLessonCompleteds?.length &&
                  lesson?.userLessonCompleteds[0].finished && (
                    <CheckOutlined color='primary' />
                  )}{' '}
                {lesson.title}
              </span>
              <span className={styles['play--duration']}>
                {`${((lesson.duation as number) / 60).toFixed(0)} دقیقه`}
              </span>
            </ButtonComponent>
          ))}
        </Row>
      ))}
    </Box>
  )

  return (
    <Row className={styles['play']}>
      <Row className={styles['play__desktopDrawer']}>{list()}</Row>

      <Row className={styles['play--content']} direction='column' align='top'>
        <Button
          className={styles['play--drawerBtn']}
          variant='contained'
          onClick={toggleDrawer(true)}

        >
          لیست ویدئوها
        </Button>
        <Drawer
          sx={{
            width: '20rem',
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: '20rem',
              boxSizing: 'border-box',
            },
          }}
          anchor='left'
          PaperProps={{
            sx: {
              backgroundColor: '#3a3a3a',
            },
          }}
          open={playDrawerStatus}
          onClose={toggleDrawer(false)}
        >
          {list()}
        </Drawer>
        <div className={styles['play__videoWrapperWrapperWrapper']}>
          <div className={styles['play__videoWrapperWrapper']}>
            <Row className={styles['play__videoWrapper']}>
              <VideoJS
                setShowNewUGQ={setShowNewUGQ}
                changeCurrentTime={changeCurrentTime}
                setChangeCurrentTime={setChangeCurrentTime}
                id={selectedLesson.id}
                timeOfVideo={selectedLesson?.userLessonCompleteds?.[0]?.timeOfVideo}
                src={isProd ? selectedLesson.videoUrl : "https://files.vidstack.io/sprite-fight/720p.mp4"}
                hasSubtitle={selectedLesson.hasSubtitle}
                onTimeChange={onTimeChange}
                next={getNextLesson()}
              />
            </Row>
          </div>
        </div>
        <Row className={styles['play__row']} direction='column' gap={2}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href={`/courses/${data?.id}`}>
              {data?.titleFa}
            </Link>
            <Typography>

              {selectedSection.title}
            </Typography>
            <Typography color="text.primary">{selectedLesson.title}</Typography>
          </Breadcrumbs>          <Row gap={0}>

          </Row>
          {!showNewNote ?
            <ButtonComponent btnType='ghost' onClick={() => setShowNewNote(true)}>افزودن یادداشت برای زمان {tovToString(toV)} ویدئو</ButtonComponent>
            : <>
              <div style={{ border: "1px solid lightgrey" }} className="default"><MDXEditor
                ref={ref}
                textareaProps={{
                  placeholder: 'test ....'
                }}

                plugins={[
                  listsPlugin(),
                  toolbarPlugin({
                    toolbarContents: () => (
                      <>
                        {' '}
                        <UndoRedo />
                        <ListsToggle />
                        <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
                      </>
                    )
                  })
                ]}
                markdown=''
              /></div>
              <Row direction='row' justify='space-between' >

                <ButtonComponent btnType='primary' style={{ width: "100px" }} onClick={saveNewNoteHandler} loading={isLoading}>ثبت</ButtonComponent>
                <ButtonComponent btnType='ghost' onClick={() => setShowNewNote(false)}>بستن</ButtonComponent>
              </Row>
            </>}
          {notes?.map((note) =>
            <Paper
              variant='outlined' elevation={12} style={{ padding: 8, }}
              sx={{
                width: '100%',
                borderRadius: 1
              }}
            >
              <Row direction='row' justify='space-between' className="default">
                <Markdown>{note.text}</Markdown>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <Chip onClick={() => { setChangeCurrentTime(note.toV as number) }} label={tovToString(note.toV as number)} />
                  <IconButton edge="end" aria-label="delete" onClick={() => deleteNoteHandler(note.id as number)}>
                    {deleteLoading ?
                      <CircularProgress size={24} /> // Show loading spinner
                      :
                      <DeleteIcon />
                    }
                  </IconButton>
                </div>              </Row>
            </Paper>
          )}
          {!!notes && !!notes.length &&
            <ButtonComponent btnType='ghost' style={{ width: "200px" }} onClick={exportToExcel}>
              دانلود یادداشت‌ها</ButtonComponent>}
          {accessToken && showNewUGQ &&
            
              <ButtonComponent btnType='primary' style={{ alignSelf:"flex-end", width: "200px" }} onClick={handleNewUGQ}>طراحی سوال برای آزمون</ButtonComponent>
          }

        </Row>
      </Row>
    </Row>
  )
}

export default PlayComponent
