// sections/_e-commerce/view/AExam.tsx
import { RootState } from 'libs/redux/store'
import { EcommerceAccountLayout } from '../layout'
import { useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  Alert,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import VerifiedIcon from '@mui/icons-material/Verified'
import PendingIcon from '@mui/icons-material/Pending'
import CancelIcon from '@mui/icons-material/Cancel'
import DownloadIcon from '@mui/icons-material/Download'
import StartIcon from '@mui/icons-material/PlayArrow'

// تایپ داده‌های دوره
type Course = {
  courseId: number
  quizId: number
  name: string
  percent: number
  preExam: {
    has: boolean
    done: boolean
    score: number | null
  }
  survey: {
    done: boolean
  }
  exam: {
    done: boolean
    passed: boolean
    score: number | null
    date: string  // تاریخ آزمون به اینجا منتقل شد
    allowed: {
      isAllowed: boolean  // مجاز هست یا نه
      description: string  // توضیحات (مثلاً: "پیش نیاز را کامل کنید" یا "هنوز ثبت‌نام نکرده‌اید")
    }
  }
  serial: string | null
  certUrl: string | null
}

type DocumentStatus = 'بارگذاری نشده' | 'در حال بررسی' | 'تایید شده' | 'رد شده'

function AExamView() {
  const { uuid } = useSelector((state: RootState) => state.auth)

  const [startingQuizId, setStartingQuizId] = useState<number | null>(null);
  
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [errorCourses, setErrorCourses] = useState('')
  
  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>('بارگذاری نشده')
  const [documentImage, setDocumentImage] = useState<string | null>(null)
  const [documentInfo, setDocumentInfo] = useState<{
    firstNameEn: string
    lastNameEn: string
    nationalCode: string
  } | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  
  // فرم استیت‌ها
  const [formData, setFormData] = useState({
    firstNameEn: '',
    lastNameEn: '',
    nationalCode: ''
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // دریافت اطلاعات دوره‌ها از API
  useEffect(() => {
    const fetchCourses = async () => {
      if (!uuid) return
      
      setLoadingCourses(true)
      setErrorCourses('')
      
      try {
        // API دریافت دوره‌ها
        const response = await fetch(`https://proback.namatek.com/api/Exam/GetCoursesExams?uuid=${uuid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error('خطا در دریافت اطلاعات دوره‌ها')
        }
        
        const data = await response.json()
        setCourses(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching courses:', err)
        setErrorCourses('مشکلی در دریافت اطلاعات پیش آمده است')
        // در صورت خطا، از داده‌های نمونه استفاده کنید (برای تست)
        setCourses([])
      } finally {
        setLoadingCourses(false)
      }
    }
    
    fetchCourses()
  }, [uuid])

  // دریافت وضعیت مدرک از API
  useEffect(() => {
    const fetchDocumentStatus = async () => {
      if (!uuid) return
      
      try {
        const response = await fetch(`https://proback.namatek.com/api/Exam/GetDocumentStatus?uuid=${uuid}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setDocumentStatus(data.status || 'بارگذاری نشده')
          if (data.imageUrl) {
            setDocumentImage(data.imageUrl)
            console.log(data.imageUrl)
          }
          if (data.userInfo) {
            setDocumentInfo(data.userInfo)
          }
        }
      } catch (err) {
        console.error('Error fetching document status:', err)
      }
    }
    
    fetchDocumentStatus()
  }, [uuid])

  const getDocumentStatusIcon = () => {
  switch(documentStatus) {
    case 'تایید شده':
      return <VerifiedIcon sx={{ fontSize: 40, color: '#22c55e' }} />
    case 'در حال بررسی':
      return <PendingIcon sx={{ fontSize: 40, color: '#eab308' }} />
    case 'رد شده':
      return <CancelIcon sx={{ fontSize: 40, color: '#ef4444' }} />
    default:
      return <CancelIcon sx={{ fontSize: 40, color: '#ef4444' }} />
  }
}

const getDocumentStatusColor = () => {
  switch(documentStatus) {
    case 'تایید شده': return 'success.main'
    case 'در حال بررسی': return 'warning.main'
    case 'رد شده': return 'error.main'
    default: return 'error.main'
  }
}

  const handleOpenDialog = () => {
    // اجازه باز شدن در حالت‌های 'بارگذاری نشده' و 'رد شده'
    if (documentStatus === 'بارگذاری نشده' || documentStatus === 'رد شده') {
      // پر کردن فرم با اطلاعات قبلی در صورت وجود
      if (documentInfo) {
        setFormData({
          firstNameEn: documentInfo.firstNameEn,
          lastNameEn: documentInfo.lastNameEn,
          nationalCode: documentInfo.nationalCode,
        })
      } else {
        setFormData({ firstNameEn: '', lastNameEn: '', nationalCode: '' })
      }
      setOpenDialog(true)
      setError('')
    }
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedFile(null)
    setImagePreview(null)
    setError('')
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0]
      setSelectedFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    }
  }

  const handleFormSubmit = async () => {
    // اعتبارسنجی
    if (!formData.firstNameEn.trim()) {
      setError('نام خود را به انگلیسی وارد کنید')
      return
    }
    if (!formData.lastNameEn.trim()) {
      setError('نام خانوادگی خود را به انگلیسی وارد کنید')
      return
    }
    if (!formData.nationalCode.trim() || formData.nationalCode.length !== 10) {
      setError('کد ملی 10 رقمی وارد کنید')
      return
    }
    if (!selectedFile) {
      setError('عکس مدرک خود را انتخاب کنید')
      return
    }

    setLoading(true)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('firstName', formData.firstNameEn)
      formDataToSend.append('lastName', formData.lastNameEn)
      formDataToSend.append('nationalCode', formData.nationalCode)
      formDataToSend.append('documentImage', selectedFile)
      formDataToSend.append('uuid', uuid || '')

      const response = await fetch('https://proback.namatek.com/api/Exam/UploadDocument', {
        method: 'POST',
        body: formDataToSend,
      })

      if (!response.ok) {
        throw new Error('خطا در آپلود')
      }

      const data = await response.json()
      
      // بعد از آپلود موفق
      setDocumentStatus('در حال بررسی')
      setDocumentImage(imagePreview)
      setDocumentInfo({
        firstNameEn: formData.firstNameEn,
        lastNameEn: formData.lastNameEn,
        nationalCode: formData.nationalCode,
      })
      handleCloseDialog()
    } catch (err) {
      setError('خطا در آپلود، مجدد تلاش کنید')
    } finally {
      setLoading(false)
    }
  }

  // هندلر برای شروع نظرسنجی
  const handleStartSurvey = async (courseId: number, courseName: string) => {
    if (!uuid) {
      console.error('UUID not found')
      return
    }
    
    setStartingQuizId(courseId)
    try {
      // انتقال به صفحه نظرسنجی با پارامترهای مورد نیاز
      window.location.href = `/dashboard/asurvey?courseId=${courseId}&courseName=${encodeURIComponent(courseName)}`
      
    } catch (err) {
      console.error('Error starting survey:', err)
      setErrorCourses('مشکلی در شروع نظرسنجی پیش آمده است')
      setStartingQuizId(null);
    }
  }

  // هندلر برای شروع آزمون و پیش آزمون
  const handleStartExam = async (quizId: number, courseName: string, description: string | null = null) => {
    if (!uuid) return;

    setStartingQuizId(quizId) // نمایش لودینگ روی دکمه
    try {
      const response = await fetch('https://proback.namatek.com/api/Exam/CreateExam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid, quizId, description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'خطا در شروع آزمون');
      }

      const data = await response.json();
      const examResultId = data.examResultId; // فرض می‌کنیم پاسخ شامل examResultId است

      // هدایت به صفحه آزمون با examResultId
      window.location.href = `/dashboard/aexamTaking?examResultId=${examResultId}&courseName=${encodeURIComponent(courseName)}`;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'مشکلی پیش آمد')
      setStartingQuizId(null);
    } finally {
      // setStartingQuizId(null);
    }
  };

  // هندلر برای دانلود مدرک
  const handleDownloadCert = async (certUrl: string) => {
    // دانلود مدرک
    window.open(certUrl, '_blank')
  }

  // نمایش لودینگ در زمان دریافت داده‌ها
  if (loadingCourses) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="xl" sx={{ py: 4, direction: 'ltr' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress sx={{ color: '#008D67' }} />
          </Box>
        </Container>
      </EcommerceAccountLayout>
    )
  }

  // نمایش خطا در صورت مشکل
  if (errorCourses) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="xl" sx={{ py: 4, direction: 'ltr' }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {errorCourses}
          </Alert>
        </Container>
      </EcommerceAccountLayout>
    )
  }

  return (
    <EcommerceAccountLayout>
      <Container maxWidth="xl" sx={{ py: 4, direction: 'ltr' }}>
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          {/* Header - سبز رنگ #008D67 */}
          <Box sx={{ bgcolor: '#008D67', color: 'white', px: 3, py: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              آزمون و مدرک
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            {/* بخش اطلاعات برای صدور گواهینامه */}
            <Paper variant="outlined" sx={{ p: 3, mb: 4, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: '#1f2937' }}>
                اطلاعات برای صدور گواهینامه
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
                {/* بخش عکس مدرک */}
                <Box sx={{ textAlign: 'center' }}>
                  {documentImage ? (
                    <Avatar 
                      src={documentImage} 
                      sx={{ width: 100, height: 100, borderRadius: 2 }}
                      variant="rounded"
                    />
                  ) : (
                    // وقتی عکس نداریم، بر اساس وضعیت آیکون مناسب نشان بده
                    <Avatar 
                      sx={{ 
                        width: 100, 
                        height: 100, 
                        bgcolor: 
                          documentStatus === 'تایید شده' ? '#dcfce7' :
                          documentStatus === 'در حال بررسی' ? '#fef3c7' :
                          documentStatus === 'رد شده' ? '#fee2e2' :
                          '#e5e7eb',
                        borderRadius: 2
                      }}
                      variant="rounded"
                    >
                      {documentStatus === 'تایید شده' && <VerifiedIcon sx={{ fontSize: 40, color: '#22c55e' }} />}
                      {documentStatus === 'در حال بررسی' && <PendingIcon sx={{ fontSize: 40, color: '#eab308' }} />}
                      {documentStatus === 'رد شده' && <CancelIcon sx={{ fontSize: 40, color: '#ef4444' }} />}
                      {documentStatus === 'بارگذاری نشده' && <CancelIcon sx={{ fontSize: 40, color: '#ef4444' }} />}
                    </Avatar>
                  )}
                </Box>

                {/* وضعیت مدرک */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    وضعیت مدرک
                  </Typography>
                  <Typography 
                    variant="h6" 
                    fontWeight="bold" 
                    sx={{ color: getDocumentStatusColor() }}
                  >
                    {documentStatus}
                  </Typography>
                </Box>

                {/* دکمه آپلود */}
                <Button
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleOpenDialog}
                  disabled={documentStatus === 'در حال بررسی' || documentStatus === 'تایید شده'}  // رد شده را غیرفعال نمی‌کند
                  sx={{
                    bgcolor: (documentStatus === 'بارگذاری نشده' || documentStatus === 'رد شده') ? '#008D67' : '#9ca3af',
                    '&:hover': {
                      bgcolor: (documentStatus === 'بارگذاری نشده' || documentStatus === 'رد شده') ? '#006B4F' : '#9ca3af'
                    },
                    minWidth: 150,
                    height: 48
                  }}
                >
                  بارگذاری مدرک
                </Button>
              </Stack>
            </Paper>

            {/* جدول دوره‌های آموزشی */}
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2, color: '#1f2937' }}>
              دوره های آموزشی
            </Typography>
            
            {courses.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">هیچ دوره‌ای یافت نشد</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table sx={{ minWidth: 1300 }}>
                  <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                    <TableRow>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>نام دوره آموزشی</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>درصد مشاهده</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>پیش آزمون</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>نظرسنجی</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>آزمون</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>تاریخ آزمون</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>نمره آزمون</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>سریال مدرک</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>مدرک</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {courses.map((course, index) => (
                      <TableRow key={index} sx={{ '&:hover': { bgcolor: '#f9fafb' } }}>
                        <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                          {course.name}
                        </TableCell>
                        
                        {/* درصد مشاهده */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={course.percent} 
                              sx={{ width: 60, height: 8, borderRadius: 4 }}
                            />
                            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 35 }}>
                              {course.percent}%
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        {/* پیش آزمون */}
                        <TableCell align="center">
                          {!course.preExam.has ? (
                            <Typography color="text.secondary">ندارد</Typography>
                          ) : course.preExam.done ? (
                            <Typography fontWeight="bold" color="success.main">
                              {course.preExam.score}
                            </Typography>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<StartIcon />}
                              onClick={() => handleStartExam(course.quizId, course.name, 'PreExam')}
                              sx={{
                                borderColor: '#008D67',
                                color: '#008D67',
                                '&:hover': {
                                  borderColor: '#006B4F',
                                  bgcolor: 'rgba(0, 141, 103, 0.04)'
                                }
                              }}
                            >
                              شروع
                            </Button>
                          )}
                        </TableCell>
                        
                        {/* نظرسنجی */}
                        <TableCell align="center">
                          {course.survey.done ? (
                            <Typography color="success.main">انجام شده</Typography>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<StartIcon />}
                              onClick={() => handleStartSurvey(course.courseId, course.name)}
                              sx={{
                                borderColor: '#008D67',
                                color: '#008D67',
                                '&:hover': {
                                  borderColor: '#006B4F',
                                  bgcolor: 'rgba(0, 141, 103, 0.04)'
                                }
                              }}
                            >
                              شروع
                            </Button>
                          )}
                        </TableCell>

                        {/* آزمون */}
                        <TableCell align="center">
                          {/* اول بررسی کن مجاز هست یا نه */}
                          {course.exam.passed ? (
                            // اگر قبلاً قبول شده
                            <Typography fontWeight="bold" color="success.main">
                              قبول شدید
                            </Typography>
                          ) : !course.exam.allowed.isAllowed ? (
                            <Tooltip title={course.exam.allowed.description}>
                              <Typography color="error.main" fontSize="0.75rem" sx={{ cursor: 'help' }}>
                                مجاز نیست
                                <br />
                                <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                                  {course.exam.allowed.description.length > 20 
                                    ? course.exam.allowed.description.slice(0, 20) + '...' 
                                    : course.exam.allowed.description}
                                </span>
                              </Typography>
                            </Tooltip>
                          ) : (
                            // اگر انجام نشده OR انجام شده ولی قبول نشده → دکمه شروع نمایش داده شود
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={startingQuizId === course.quizId ? <CircularProgress size={16} color="inherit" /> : <StartIcon />}
                              onClick={() => handleStartExam(course.quizId, course.name)}
                              disabled={startingQuizId === course.quizId} // دکمه غیرفعال شود
                              sx={{
                                bgcolor: '#008D67',
                                '&:hover': { bgcolor: '#006B4F' },
                              }}
                            >
                              شروع
                            </Button>
                          )}
                        </TableCell>

                        {/* تاریخ آزمون */}
                        <TableCell align="center">
                          {course.exam.date ? (
                            <Typography>{course.exam.date}</Typography>
                          ) : (
                            <Typography color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        
                        {/* نمره آزمون */}
                        <TableCell align="center">
                          {course.exam.done ? (
                            <Typography 
                              fontWeight="bold" 
                              color={course.exam.passed ? 'success.main' : 'error.main'}
                            >
                              {course.exam.score}
                            </Typography>
                          ) : (
                            <Typography color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        
                        {/* سریال مدرک */}
                        <TableCell align="center">
                          {course.serial ? (
                            <Typography variant="body2" fontFamily="monospace" fontWeight="medium" color="#008D67">
                              {course.serial}
                            </Typography>
                          ) : (
                            <Typography color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        
                        {/* مدرک - دکمه دانلود */}
                        <TableCell align="center">
                          {course.certUrl ? (
                            <Tooltip title="دانلود مدرک">
                              <IconButton
                                onClick={() => handleDownloadCert(course.certUrl!)}
                                sx={{
                                  color: '#008D67',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 141, 103, 0.04)'
                                  }
                                }}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <Typography color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>
      </Container>

      {/* Dialog پاپ آپ فرم بارگذاری مدرک */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: 1, borderColor: '#e2e8f0' }}>
          <Typography variant="h6" fontWeight="bold">
            بارگذاری مدرک
          </Typography>
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="نام (به انگلیسی)"
              value={formData.firstNameEn}
              onChange={(e) => setFormData({ ...formData, firstNameEn: e.target.value })}
              placeholder="مثال: Ali"
              dir="ltr"
              required
            />
            
            <TextField
              fullWidth
              label="نام خانوادگی (به انگلیسی)"
              value={formData.lastNameEn}
              onChange={(e) => setFormData({ ...formData, lastNameEn: e.target.value })}
              placeholder="مثال: Mohammadi"
              dir="ltr"
              required
            />
            
            <TextField
              fullWidth
              label="کد ملی"
              value={formData.nationalCode}
              onChange={(e) => setFormData({ ...formData, nationalCode: e.target.value })}
              placeholder="1234567890"
              dir="ltr"
              inputProps={{ maxLength: 10 }}
              required
            />
            
            <FormControl fullWidth>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ height: 56 }}
              >
                انتخاب عکس مدرک
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Button>
              {selectedFile && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  فایل انتخاب شده: {selectedFile.name}
                </Typography>
              )}
            </FormControl>
            
            {imagePreview && (
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Avatar 
                  src={imagePreview} 
                  sx={{ width: 150, height: 150, borderRadius: 2 }}
                  variant="rounded"
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            انصراف
          </Button>
          <Button 
            onClick={handleFormSubmit} 
            variant="contained" 
            disabled={loading}
            sx={{ bgcolor: '#008D67', '&:hover': { bgcolor: '#006B4F' } }}
          >
            {loading ? <CircularProgress size={24} /> : 'بارگذاری'}
          </Button>
        </DialogActions>
      </Dialog>
    </EcommerceAccountLayout>
  )
}

export default AExamView