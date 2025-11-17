// url:namatek.com/dashboard/aexam
import { RootState } from 'libs/redux/store'
import { EcommerceAccountLayout } from '../layout' 
import { useSelector } from 'react-redux'
import { useState, useEffect } from 'react'

function AExamView() {
  const { uuid } = useSelector((state: RootState) => state.auth)
  const [iframeKey, setIframeKey] = useState(Date.now()) // برای رفرش خودکار

  useEffect(() => {
    setIframeKey(Date.now()) // هر بار که کامپوننت mount شد، key تغییر می‌کنه
  }, [uuid]) 

  // useEffect(() => {
  //   if (!accessToken) {
  //     push('/')
  //     return
  //   }
  // }, [accessToken])

  return (
    <EcommerceAccountLayout>
      <iframe
        key={iframeKey}
        src={`https://company.namatek.com/app/takeexam/makeexam-65e9c73f0c0e3445c4c68e4d?embed=true&environment=production&uuid=${uuid}`}
        width={"100%"}
        style={{ border:"0", height:'75vh' }}
      />
    </EcommerceAccountLayout >
  )
}

export default AExamView
