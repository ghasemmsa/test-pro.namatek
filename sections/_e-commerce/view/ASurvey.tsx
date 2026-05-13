// sections/_e-commerce/view/ASurvey.tsx
'use client'

import { RootState } from 'libs/redux/store'
import { EcommerceAccountLayout } from '../layout'
import { useSelector } from 'react-redux'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  AlertTitle
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SendIcon from '@mui/icons-material/Send'

// سوالات ثابت بر اساس مدل دیتابیس
type QuestionType = 'content' | 'teacher' | 'facility'

interface Question {
  id: string
  text: string
  type: QuestionType
  categoryName: string
}

const FIXED_QUESTIONS: Question[] = [
  // محتوا (Content)
  { id: 'content_1', text: 'محتوا و مطالب ارائه‌شده در ویدئوها جامع و کاربردی بود و به نیازهای شغلی من به‌خوبی پاسخ داد.', type: 'content', categoryName: 'محتوا' },
  { id: 'content_2', text: 'ساختار ویدئوها به‌گونه‌ای بود که به‌راحتی مطالب را دنبال می‌کردم.', type: 'content', categoryName: 'محتوا' },
  { id: 'content_3', text: 'محتوا و مطالب ارائه‌شده در ویدئوها به‌روز بود.', type: 'content', categoryName: 'محتوا' },
  { id: 'content_4', text: 'ویدئوها شامل مثال‌ها و توضیحات کافی برای درک بهتر مطالب بودند.', type: 'content', categoryName: 'محتوا' },
  { id: 'content_5', text: 'محتوا و مطالب ارائه‌شده در ویدئوها سازمان‌دهی‌شده بود و اهداف دوره را به‌خوبی پوشش داد.', type: 'content', categoryName: 'محتوا' },
  
  // مدرس (Teacher)
  { id: 'teacher_1', text: 'مدرس به‌خوبی و به شیوه‌ای روان مطالب را در ویدئوها توضیح می‌داد.', type: 'teacher', categoryName: 'مدرس / تدریس' },
  { id: 'teacher_2', text: 'نحوه بیان و ارائه مدرس در ویدئوها به درک مطالب کمک می‌کرد.', type: 'teacher', categoryName: 'مدرس / تدریس' },
  { id: 'teacher_3', text: 'مدرس توانایی کافی در ارائه مفاهیم پیچیده به زبان ساده داشت.', type: 'teacher', categoryName: 'مدرس / تدریس' },
  { id: 'teacher_4', text: 'مدرس از مثال‌ها و توضیحات مفید برای تفهیم بهتر موضوعات استفاده می‌کرد.', type: 'teacher', categoryName: 'مدرس / تدریس' },
  { id: 'teacher_5', text: 'نحوه تدریس مدرس انگیزه لازم برای یادگیری را در من ایجاد می‌کرد.', type: 'teacher', categoryName: 'مدرس / تدریس' },
  
  // امکانات (Facility)
  { id: 'fac_1', text: 'دسترسی به ویدئوها از طریق بستر مجازی (LMS) به‌آسانی و بدون مشکل بود.', type: 'facility', categoryName: 'امکانات و تجهیزات' },
  { id: 'fac_2', text: 'کیفیت فنی ویدئوها (تصویر و صدا) مناسب و واضح بود.', type: 'facility', categoryName: 'امکانات و تجهیزات' },
  { id: 'fac_3', text: 'ارتباطات، تعامل و پاسخ‌گویی مسئول دوره آموزشی در طول دوره مؤثر و به‌موقع بود.', type: 'facility', categoryName: 'امکانات و تجهیزات' },
  { id: 'fac_4', text: 'پیامک‌های اطلاع‌رسانی دوره‌ها به‌موقع و به‌درستی ارسال شد.', type: 'facility', categoryName: 'امکانات و تجهیزات' },
  { id: 'fac_5', text: 'بستر مجازی (LMS) امکانات لازم برای مشاهده ویدئوها از طریق گوشی یا کامپیوتر را به‌خوبی فراهم کرد.', type: 'facility', categoryName: 'امکانات و تجهیزات' },
  { id: 'fac_6', text: 'مدت زمان ویدئوها برای یادگیری کافی و مناسب بود.', type: 'facility', categoryName: 'امکانات و تجهیزات' },
]

const LIKERT_OPTIONS = [
  { value: 5, label: 'خیلی موافقم' },
  { value: 4, label: 'موافقم' },
  { value: 3, label: 'تا حدودی موافقم' },
  { value: 2, label: 'مخالفم' },
  { value: 1, label: 'خیلی مخالفم' },
]

function ASurveyView() {
  const { uuid } = useSelector((state: RootState) => state.auth)
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const courseId = searchParams.get('courseId')
  const courseNameFromUrl = searchParams.get('courseName')
  
  const [courseName, setCourseName] = useState<string>(courseNameFromUrl || 'دوره آموزشی')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [openAnswers, setOpenAnswers] = useState({ strengths: '', weaknesses: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [existingSurveyId, setExistingSurveyId] = useState<number | null>(null)

  // بررسی آیا قبلاً نظرسنجی ثبت شده است
  useEffect(() => {
    const checkExistingSurvey = async () => {
      if (!uuid || !courseId) return

      try {
        const response = await fetch(
          `https://proback.namatek.com/api/Survey/CheckExisting?uuid=${uuid}&courseId=${courseId}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        )

        if (response.ok) {
          const data = await response.json()
          if (data.exists && data.surveyId) {
            setExistingSurveyId(data.surveyId)
            setSuccess(true)
            setTimeout(() => router.push('/dashboard/aexam'), 2000)
            return
          }
        }
      } catch (err) {
        console.error('Error checking existing survey:', err)
      } finally {
        setLoading(false)
      }
    }

    if (courseId && uuid) {
      checkExistingSurvey()
    } else {
      setLoading(false)
    }
  }, [uuid, courseId, router])

  const handleScoreChange = (questionId: string, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const calculateProgress = () => {
    const totalQuestions = FIXED_QUESTIONS.length
    const answeredCount = Object.keys(answers).length
    return totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0
  }

  const isStepComplete = (step: number) => {
    if (step === 0) {
      const contentQuestions = FIXED_QUESTIONS.filter(q => q.type === 'content')
      return contentQuestions.every(q => answers[q.id] !== undefined)
    }
    if (step === 1) {
      const teacherQuestions = FIXED_QUESTIONS.filter(q => q.type === 'teacher')
      return teacherQuestions.every(q => answers[q.id] !== undefined)
    }
    if (step === 2) {
      const facilityQuestions = FIXED_QUESTIONS.filter(q => q.type === 'facility')
      return facilityQuestions.every(q => answers[q.id] !== undefined)
    }
    return true
  }

  const handleSubmit = async () => {
    const allAnswered = FIXED_QUESTIONS.every(q => answers[q.id] !== undefined)
    if (!allAnswered) {
      setError('لطفاً به تمام سوالات پاسخ دهید')
      return
    }
  
    setSubmitting(true)
    setError('')
  
    try {
      // یک درخواست واحد برای ثبت کل نظرسنجی
      const payload = {
        uuid: uuid,
        courseId: Number(courseId),
        courseName: courseName,
        responses: Object.entries(answers).map(([questionId, score]) => ({
          questionId: questionId,
          score: score,
        })),
        openAnswers: {
          strengths: openAnswers.strengths,
          weaknesses: openAnswers.weaknesses,
        },
        submittedAt: new Date().toISOString()
      }
  
      const response = await fetch('https://proback.namatek.com/api/Exam/SubmitSurvey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
  
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'خطا در ثبت نظرسنجی')
      }
  
      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/aexam')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'مشکلی در ثبت نظرسنجی پیش آمد. لطفاً مجدد تلاش کنید.')
    } finally {
      setSubmitting(false)
    }
  }

  const contentQuestions = FIXED_QUESTIONS.filter(q => q.type === 'content')
  const teacherQuestions = FIXED_QUESTIONS.filter(q => q.type === 'teacher')
  const facilityQuestions = FIXED_QUESTIONS.filter(q => q.type === 'facility')
  const steps = ['محتوا', 'مدرس / تدریس', 'امکانات و تجهیزات', 'بازخورد تکمیلی']

  // اعتبارسنجی پارامترها
  if ((!courseId) && !existingSurveyId && !loading) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="lg" sx={{ py: 4, direction: 'ltr' }}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <AlertTitle>خطا</AlertTitle>
            پارامترهای لازم برای نمایش نظرسنجی موجود نیست
            <Button variant="outlined" onClick={() => router.push('/dashboard/exam')} sx={{ mt: 2 }}>
              بازگشت به صفحه آزمون
            </Button>
          </Alert>
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

  if (success) {
    return (
      <EcommerceAccountLayout>
        <Container maxWidth="lg" sx={{ py: 4, direction: 'ltr' }}>
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#22c55e', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              از مشارکت شما سپاسگزاریم
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              نظرسنجی با موفقیت ثبت شد. بازخورد شما در بهبود کیفیت دوره‌ها مؤثر خواهد بود.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              در حال انتقال به صفحه آزمون...
            </Typography>
          </Paper>
        </Container>
      </EcommerceAccountLayout>
    )
  }

  return (
    <EcommerceAccountLayout>
      <Container maxWidth="lg" sx={{ py: 4, direction: 'ltr' }}>
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: 'unset' }}>
          <Box sx={{ bgcolor: '#008D67', color: 'white', px: 3, py: 2 }}>
            <Typography variant="h5" fontWeight="bold">
              نظرسنجی دوره آموزشی: {courseName}
            </Typography>
          </Box>

          <Box sx={{ p: 3 }}>
            <Paper variant="outlined" sx={{ p: 3, mb: 4, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                فراگیر گرامی، پرسشنامه حاضر به منظور جمع‌آوری و تحلیل نظرات و بازخوردهای شما در مورد برنامه آموزشی
                که در آن شرکت نموده‌اید تقدیم شده است. نظرات و بازخوردهای دقیق و صادقانه شما به ما کمک می‌کند تا
                برنامه‌های آتی را با کیفیت بهتر و متناسب‌تر برنامه‌ریزی و اجرا نماییم.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                با تشکر — واحد آزمون و ارزشیابی
              </Typography>
            </Paper>

            {/* نوار پیشرفت sticky با سایه */}
            <Box 
              sx={{ 
                position: 'sticky', 
                top: { xs: 20, sm: 75 }, 
                zIndex: 100,
                mb: 4,
                background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                borderRadius: 1,
                border: '1px solid',
                borderColor: '#e8eef2',
                boxShadow: '0 8px 20px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.02)',
                transition: 'box-shadow 0.2s ease',
                '&:hover': {
                  boxShadow: '0 12px 24px rgba(0,0,0,0.08)'
                }
              }}
            >
              <Box sx={{ p: 2 }}>
                {/* ردیف بالا */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight="600" sx={{ color: '#1e293b' }}>
                   پیشرفت کلی
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
                      <Typography variant="caption" color="text.secondary">
                        پاسخ‌شده: {Object.keys(answers).length}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                      <Typography variant="caption" color="text.secondary">
                        باقیمانده: {FIXED_QUESTIONS.length - Object.keys(answers).length}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* نوار پیشرفت */}
                <LinearProgress 
                  variant="determinate" 
                  value={calculateProgress()} 
                  sx={{ 
                    height: 12, 
                    borderRadius: 6, 
                    bgcolor: '#eef2ff',
                    mb: 1.5,
                    '& .MuiLinearProgress-bar': { 
                      bgcolor: '#008D67',
                      borderRadius: 6,
                      backgroundImage: 'linear-gradient(90deg, #008D67, #059669, #10b981)',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    } 
                  }} 
                />

                {/* درصد و پیام تشویقی */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {calculateProgress() === 100 ? '🎉 عالی! تمام سوالات پاسخ داده شده' : '💪 به مسیر ادامه دهید'}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ color: '#008D67' }}>
                    {Math.round(calculateProgress())}%
                  </Typography>
                </Box>
              </Box>
            </Box>


            <Box 
              sx={{ 
                mb: 4, 
                overflowX: 'auto', 
                overflowY: 'hidden',
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-track': { bgcolor: '#f1f1f1', borderRadius: 2 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#008D67', borderRadius: 2 }
              }}
            >
              <Stepper 
                activeStep={activeStep} 
                sx={{ 
                  direction: 'ltr',
                  minWidth: { xs: '500px', sm: '100%' }  // حداقل عرض برای موبایل
                }}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* مرحله 1: محتوا */}
            {activeStep === 0 && (
              <Stack spacing={3}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#008D67' }}>ارزیابی محتوای آموزشی</Typography>
                {contentQuestions.map((question, idx) => (
                  <Card key={question.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <FormControl component="fieldset" fullWidth required>
                        <FormLabel component="legend" sx={{ mb: 2, fontWeight: 500 }}>
                          {idx + 1}. {question.text}
                        </FormLabel>
                        <RadioGroup
                          value={answers[question.id] || ''}
                          onChange={(e) => handleScoreChange(question.id, Number(e.target.value))}
                          row
                          sx={{ flexWrap: 'wrap', gap: 1 }}
                        >
                          {LIKERT_OPTIONS.map((opt) => (
                            <FormControlLabel
                              key={opt.value}
                              value={opt.value}
                              control={<Radio sx={{ '&.Mui-checked': { color: '#008D67' } }} />}
                              label={opt.label}
                              sx={{ ml: 2 }}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {/* مرحله 2: مدرس */}
            {activeStep === 1 && (
              <Stack spacing={3}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#008D67' }}>ارزیابی مدرس و نحوه تدریس</Typography>
                {teacherQuestions.map((question, idx) => (
                  <Card key={question.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <FormControl component="fieldset" fullWidth required>
                        <FormLabel component="legend" sx={{ mb: 2, fontWeight: 500 }}>
                          {idx + 1}. {question.text}
                        </FormLabel>
                        <RadioGroup
                          value={answers[question.id] || ''}
                          onChange={(e) => handleScoreChange(question.id, Number(e.target.value))}
                          row
                          sx={{ flexWrap: 'wrap', gap: 1 }}
                        >
                          {LIKERT_OPTIONS.map((opt) => (
                            <FormControlLabel
                              key={opt.value}
                              value={opt.value}
                              control={<Radio sx={{ '&.Mui-checked': { color: '#008D67' } }} />}
                              label={opt.label}
                              sx={{ ml: 2 }}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {/* مرحله 3: امکانات */}
            {activeStep === 2 && (
              <Stack spacing={3}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#008D67' }}>ارزیابی امکانات و تجهیزات</Typography>
                {facilityQuestions.map((question, idx) => (
                  <Card key={question.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <FormControl component="fieldset" fullWidth required>
                        <FormLabel component="legend" sx={{ mb: 2, fontWeight: 500 }}>
                          {idx + 1}. {question.text}
                        </FormLabel>
                        <RadioGroup
                          value={answers[question.id] || ''}
                          onChange={(e) => handleScoreChange(question.id, Number(e.target.value))}
                          row
                          sx={{ flexWrap: 'wrap', gap: 1 }}
                        >
                          {LIKERT_OPTIONS.map((opt) => (
                            <FormControlLabel
                              key={opt.value}
                              value={opt.value}
                              control={<Radio sx={{ '&.Mui-checked': { color: '#008D67' } }} />}
                              label={opt.label}
                              sx={{ ml: 2 }}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}

            {/* مرحله 4: بازخورد تکمیلی */}
            {activeStep === 3 && (
              <Stack spacing={4}>
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#008D67' }}>بازخوردهای تکمیلی</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="نقاط قوت برنامه آموزشی را بنویسید"
                  placeholder="مثال: محتوای کاربردی، تدریس روان، پشتیبانی خوب، ..."
                  value={openAnswers.strengths}
                  onChange={(e) => setOpenAnswers(prev => ({ ...prev, strengths: e.target.value }))}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="نقاط ضعف برنامه آموزشی که باید اصلاح شود، همراه با پیشنهادات اصلاحی"
                  placeholder="مثال: طولانی بودن ویدئوها، کیفیت صدا، عدم تمرین عملی، ..."
                  value={openAnswers.weaknesses}
                  onChange={(e) => setOpenAnswers(prev => ({ ...prev, weaknesses: e.target.value }))}
                />
              </Stack>
            )}

            {/* دکمه‌های ناوبری */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(prev => prev - 1)}
                disabled={activeStep === 0}
                sx={{ borderColor: '#008D67', color: '#008D67', '&:hover': { borderColor: '#006B4F', bgcolor: 'rgba(0, 141, 103, 0.04)' } }}
              >
                قبلی
              </Button>

              {activeStep < steps.length - 1 ? (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  disabled={!isStepComplete(activeStep)}
                  sx={{ bgcolor: '#008D67', '&:hover': { bgcolor: '#006B4F' } }}
                >
                  بعدی
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={submitting || !isStepComplete(activeStep)}
                  startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                  sx={{ bgcolor: '#008D67', '&:hover': { bgcolor: '#006B4F' } }}
                >
                  {submitting ? 'در حال ثبت...' : 'ارسال نظرسنجی'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    </EcommerceAccountLayout>
  )
}

export default ASurveyView