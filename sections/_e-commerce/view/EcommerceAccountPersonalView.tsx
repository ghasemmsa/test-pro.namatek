// url:namatek.com/dashboard/profile
import { LoadingButton } from '@mui/lab'
import { Typography } from '@mui/material'
import { EcommerceAccountLayout } from '../layout'

function EcommerceAccountPersonalView() {

  return (
    <EcommerceAccountLayout>

      <Typography variant='h5'
        style={{ marginTop: "1.5rem", marginBottom: "1rem" }}
      >
        پرسش و پاسخ در نماتک
      </Typography>
      <Typography variant='body1'
        style={{ marginBottom: "1rem" }}
      >
        نماتک برای پاسخ به سوالات شما، بستری به نشانی <a href="https://katibeha.com" target="_blank" style={{ color: "#007d67" }}>katibeha.com</a> ایجاد کرده است.<br />
        برای پرسیدن سوالات خود از نماتک، از لینک زیر می‌توانید اقدام نمایید.
      </Typography>

      <LoadingButton
        color='primary'
        size='large'
        type='submit'
        variant='contained'
        onClick={() => { window.open('https://katibeha.com', '_blank') }}
        sx={{ marginBlockStart: '1rem' }}
      >
        ورود به کتیبه‌ها
      </LoadingButton>
    </EcommerceAccountLayout >
  )
}

export default EcommerceAccountPersonalView
