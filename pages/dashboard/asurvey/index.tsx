import Head from 'next/head'
import MainLayout from 'layout/main/MainLayout'
import ASurveyView from 'sections/_e-commerce/view/ASurvey'

DashboardProfilePage.getLayout = (page: React.ReactElement) => (
  <MainLayout>{page}</MainLayout>
)

function DashboardProfilePage() {
  return (
    <>
      <Head>
        <title>آزمون و مدرک - نظرسنجی</title>
      </Head>

      <ASurveyView />
    </>
  )
}

export default DashboardProfilePage
