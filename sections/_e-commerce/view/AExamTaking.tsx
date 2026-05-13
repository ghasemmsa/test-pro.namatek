// sections/_e-commerce/view/AExamTaking.tsx
'use client'

import { RootState } from 'libs/redux/store'
import { EcommerceAccountLayout } from '../layout'
import { useSelector } from 'react-redux'
import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Card,
  CardContent,
  Stack,
  Grid,
  Chip,
  Avatar
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import FlagIcon from '@mui/icons-material/Flag'
import ImageIcon from '@mui/icons-material/Image'

interface Question {
  id: number
  order: number
  title: string
  answer1: string
  answer2: string
  answer3: string
  answer4: string
  imageUrl?: string
  answerImage1?: string
  answerImage2?: string
  answerImage3?: string
  answerImage4?: string
}

interface ExamData {
  examResultId: number
  quizId: number
  questionCount: number
  questionDuration: number
  totalDuration: number
  canBack: boolean
  canSkip: boolean
  canShuffle: boolean
  acceptScore: number
  questions: Question[]
}

function AExamTakingView() {
  const { uuid } = useSelector((state: RootState) => state.auth)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const examResultId = searchParams.get('examResultId')
  const courseName = searchParams.get('courseName')
  
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [examFinished, setExamFinished] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const questionStartTimeRef = useRef<Date>(new Date())
  const examDataRef = useRef<ExamData | null>(null)
  const uuidRef = useRef<string | null | undefined>(null)


  // به‌روزرسانی ref با آخرین مقدار examData
  useEffect(() => {
    examDataRef.current = examData;
  }, [examData]);

  // به‌روزرسانی ref
  useEffect(() => {
    uuidRef.current = uuid;
  }, [uuid]);

  // مدیریت ترک صفحه و رفرش - با ارسال درخواست پایان آزمون
  useEffect(() => {
    const finishExamOnUnload = () => {
      const currentExamData = examDataRef.current;
      const currentUuid = uuidRef.current;
      
      console.log('finishExamOnUnload called', { 
        examData: currentExamData?.examResultId, 
        uuid: currentUuid 
      });
      
      if (!examFinished && currentExamData && currentUuid) {
        const url = 'https://proback.namatek.com/api/Exam/FinishExam';
        const data = JSON.stringify({ 
          examResultId: currentExamData.examResultId,
          uuid: currentUuid
        });
        
        // استفاده از fetch با keepalive
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(err => console.error('Fetch error:', err));
      } else {
        console.log('Skipping - conditions not met:', { 
          examFinished, 
          hasExamData: !!currentExamData, 
          hasUuid: !!currentUuid 
        });
      }
    };
  
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!examFinished) {
        console.log('beforeunload triggered');
        e.preventDefault();
        e.returnValue = '';
        
        finishExamOnUnload();
        sessionStorage.setItem('examRefreshed', 'true');
      }
    };
  
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [examFinished]);

  // چک کردن sessionStorage در mount اولیه
  // useEffect(() => {
  //   if (sessionStorage.getItem('examRefreshed') === 'true') {
  //     sessionStorage.removeItem('examRefreshed');
  //     router.push('/dashboard/aexam');
  //   }
  // }, [router]);

  // پاک کردن flag در پایان عادی آزمون
  useEffect(() => {
    if (examFinished) {
      sessionStorage.removeItem('examRefreshed');
    }
  }, [examFinished]);

  // شروع آزمون
  useEffect(() => {
    const startExam = async () => {
      if (!uuid || !examResultId) {
        setError('اطلاعات لازم برای شروع آزمون موجود نیست');
        setLoading(false);
        return;
      }
  
      try {
        const response = await fetch(
          `https://proback.namatek.com/api/Exam/StartExam?examResultId=${examResultId}&uuid=${uuid}`,
          { method: 'GET' }
        );
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'خطا در شروع آزمون');
        }
  
        const data = await response.json();
        setExamData(data);
        setTimeLeft(data.questionDuration);
        questionStartTimeRef.current = new Date();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'مشکلی در شروع آزمون پیش آمد');
      } finally {
        setLoading(false);
      }
    };
  
    startExam();
  }, [uuid, examResultId]);

  // تایمر برای هر سوال
  useEffect(() => {
    if (!examData || examFinished || loading) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          handleNextQuestion()
          return examData.questionDuration
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentQuestionIndex, examData, examFinished, loading])

  // ثبت پاسخ سوال
  const saveAnswer = async (questionId: number, selectedAnswer: number) => {
    if (!examData) return
    
    // اگر پاسخ معتبر نیست (0 یا null)، به سرور ارسال نکن
    if (!selectedAnswer || selectedAnswer === 0) {
      return;
    }

    try {
      const response = await fetch('https://proback.namatek.com/api/Exam/SubmitAnswer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examResultId: examData.examResultId,
          questionId: questionId,
          selectedAnswer: selectedAnswer,
          startDate: questionStartTimeRef.current
        })
      })

      if (!response.ok) {
        throw new Error('خطا در ثبت پاسخ')
      }

      setAnswers(prev => ({ ...prev, [questionId]: selectedAnswer }))
      questionStartTimeRef.current = new Date()
      
    } catch (err) {
      console.error('Error saving answer:', err)
    }
  }

  const handleAnswerChange = (questionId: number, value: number) => {
    // فقط گزینه‌های معتبر (۱ تا ۴) را ذخیره کن
    if (value >= 1 && value <= 4) {
      saveAnswer(questionId, value)
    }
  }

  const handleNextQuestion = async () => {
    if (!examData) return
    
    // اگر کاربر پاسخی انتخاب نکرده، بدون ذخیره به سوال بعدی برو
    // پاسخ‌ها قبلاً در handleAnswerChange ذخیره شده‌اند
    
    if (currentQuestionIndex + 1 < examData.questionCount) {
      setCurrentQuestionIndex(prev => prev + 1)
      setTimeLeft(examData.questionDuration)
      questionStartTimeRef.current = new Date()
    } else {
      await finishExam()
    }
  }

  const handlePreviousQuestion = () => {
    if (examData?.canBack && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      setTimeLeft(examData.questionDuration)
      questionStartTimeRef.current = new Date()
    }
  }

  const finishExam = async () => {
    if (!examData) return
    
    setSubmitting(true)
    
    try {
      const response = await fetch('https://proback.namatek.com/api/Exam/FinishExam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          examResultId: examData.examResultId, 
          uuid 
        })
      })

      if (!response.ok) {
        throw new Error('خطا در پایان آزمون')
      }

      const data = await response.json()
      setResult(data)
      setExamFinished(true)
      
      if (timerRef.current) clearInterval(timerRef.current)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مشکلی در پایان آزمون پیش آمد')
    } finally {
      setSubmitting(false)
    }
  }

  // نمایش نتیجه نهایی
  if (examFinished && result) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="md" sx={{ py: 4, direction: 'ltr' }}>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            {result.passed ? (
              <CheckCircleIcon sx={{ fontSize: 80, color: '#22c55e', mb: 2 }} />
            ) : (
              <CancelIcon sx={{ fontSize: 80, color: '#ef4444', mb: 2 }} />
            )}
            
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {result.passed ? 'تبریک!' : 'متاسفانه قبول نشدید'}
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {result.message}
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#f0fdf4' }}>
                  <Typography variant="h4" color="#22c55e" fontWeight="bold">
                    {Math.round(result.score)}%
                  </Typography>
                  <Typography variant="caption">نمره شما</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#eef2ff' }}>
                  <Typography variant="h4" color="#3b82f6" fontWeight="bold">
                    {result.correct}
                  </Typography>
                  <Typography variant="caption">پاسخ صحیح</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#fef3c7' }}>
                  <Typography variant="h4" color="#f59e0b" fontWeight="bold">
                    {result.wrong}
                  </Typography>
                  <Typography variant="caption">پاسخ غلط</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, bgcolor: '#fee2e2' }}>
                  <Typography variant="h4" color="#ef4444" fontWeight="bold">
                    {result.notAnswered}
                  </Typography>
                  <Typography variant="caption">بدون پاسخ</Typography>
                </Paper>
              </Grid>
            </Grid>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              نمره قبولی: {result.acceptScore}%
            </Typography>
            
            <Button
              variant="contained"
              onClick={() => router.push('/dashboard/aexam')}
              sx={{ bgcolor: '#008D67', '&:hover': { bgcolor: '#006B4F' } }}
            >
              بازگشت به صفحه آزمون‌ها
            </Button>
          </Paper>
        </Container>
      </EcommerceAccountLayout>
    )
  }

  if (loading) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="lg" sx={{ py: 4, direction: 'ltr' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress sx={{ color: '#008D67' }} />
          </Box>
        </Container>
      </EcommerceAccountLayout>
    )
  }

  if (error) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="lg" sx={{ py: 4, direction: 'ltr' }}>
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: 2,
              flexDirection: 'column',
              alignItems: 'flex-start',
              '& .MuiAlert-message': {
                width: '100%',
                mb: 1
              },
              '& .MuiAlert-action': {
                padding: 0,
                mr: 0,
                mt: 1
              }
            }}
            action={
              <Button 
                variant="outlined" 
                color="error" 
                onClick={() => router.push('/dashboard/aexam')}
              >
                بازگشت به صفحه آزمون‌ها
              </Button>
            }
          >
            {error}
          </Alert>
        </Container>
      </EcommerceAccountLayout>
    )
  }

  if (!examData) return null

  const currentQuestion = examData.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex) / examData.questionCount) * 100
  const answeredCount = Object.keys(answers).length

  // ساخت آرایه گزینه‌ها با عکس‌هایشان
  const options = [
    { value: 1, label: currentQuestion.answer1, image: currentQuestion.answerImage1 },
    { value: 2, label: currentQuestion.answer2, image: currentQuestion.answerImage2 },
    { value: 3, label: currentQuestion.answer3, image: currentQuestion.answerImage3 },
    { value: 4, label: currentQuestion.answer4, image: currentQuestion.answerImage4 },
  ]

  return (
    <EcommerceAccountLayout>
      <Container maxWidth="lg" sx={{ py: 4, direction: 'ltr' }}>
        {/* هدر آزمون */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container alignItems="center" justifyContent="space-between">
            <Grid item>
              <Typography variant="h6" fontWeight="bold">
                آزمون: {courseName}
              </Typography>
            </Grid>
            <Grid item>
              <Chip 
                icon={<AccessTimeIcon />} 
                label={`زمان باقیمانده: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                sx={{ bgcolor: timeLeft < 10 ? '#fee2e2' : '#e8f5e9', color: timeLeft < 10 ? '#ef4444' : '#008D67' }}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* هشدار ترک صفحه */}
        {!examFinished && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-message': { direction: 'ltr' } 
            }}
          >
            هشدار: در صورت بستن یا رفرش صفحه، آزمون شما از بین می‌رود و امکان ادامه وجود ندارد!
          </Alert>
        )}

        {/* نوار پیشرفت */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              پیشرفت آزمون
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="#008D67">
              {currentQuestionIndex + 1} از {examData.questionCount}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: '#008D67' } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            پاسخ داده شده: {answeredCount} سوال
          </Typography>
        </Box>

        {/* تایمر سوال */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            زمان پاسخ به این سوال
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ color: timeLeft < 5 ? '#ef4444' : '#008D67' }}>
            {timeLeft} ثانیه
          </Typography>
        </Paper>

        {/* سوال اصلی */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            {/* تصویر سوال (اگر وجود داشته باشد) */}
            {currentQuestion.imageUrl && (
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Box
                  component="img"
                  src={currentQuestion.imageUrl}
                  alt="تصویر سوال"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    objectFit: 'contain',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                  }}
                  onError={(e: any) => {
                    e.target.style.display = 'none'
                  }}
                />
              </Box>
            )}
            
            {/* متن سوال */}
            <Typography variant="h6" gutterBottom>
              سوال {currentQuestion.order}: {currentQuestion.title}
            </Typography>
            
            {/* گزینه‌های پاسخ با عکس */}
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, Number(e.target.value))}
              >
                <Stack spacing={1}>
                  {options.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          {option.image && (
                            <Box
                              component="img"
                              src={option.image}
                              alt={`گزینه ${option.value}`}
                              sx={{
                                width: 80,
                                height: 80,
                                objectFit: 'contain',
                                border: '1px solid #e5e7eb',
                                borderRadius: 1
                              }}
                              onError={(e: any) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          )}
                          <Typography sx={{ flex: 1 }}>{option.label}</Typography>
                        </Box>
                      }
                      sx={{ 
                        width: '100%', 
                        m: 0,
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: answers[currentQuestion.id] === option.value ? '#008D67' : '#e5e7eb',
                        bgcolor: answers[currentQuestion.id] === option.value ? 'rgba(0, 141, 103, 0.04)' : 'transparent',
                        '&:hover': {
                          bgcolor: 'rgba(0, 141, 103, 0.08)',
                          borderColor: '#008D67'
                        },
                        '& .MuiFormControlLabel-label': {
                          width: '100%'
                        }
                      }}
                    />
                  ))}
                </Stack>
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>

        {/* دکمه‌های ناوبری */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            onClick={handlePreviousQuestion}
            disabled={!examData.canBack || currentQuestionIndex === 0}
            startIcon={<NavigateNextIcon />}
            sx={{ borderColor: '#008D67', color: '#008D67' }}
          >
            قبلی
          </Button>
          
          <Button
            variant="contained"
            onClick={handleNextQuestion}
            endIcon={currentQuestionIndex + 1 < examData.questionCount ? <NavigateBeforeIcon /> : <FlagIcon />}
            sx={{ bgcolor: '#008D67', '&:hover': { bgcolor: '#006B4F' } }}
            disabled={submitting}
          >
            {currentQuestionIndex + 1 < examData.questionCount ? 'بعدی' : 'پایان آزمون'}
          </Button>
        </Box>
      </Container>
    </EcommerceAccountLayout>
  )
}

export default AExamTakingView