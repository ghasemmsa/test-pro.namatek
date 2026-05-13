import Head from 'next/head'
import MainLayout from 'layout/main/MainLayout'
import AExamTakingView from 'sections/_e-commerce/view/AExamTaking'

DashboardProfilePage.getLayout = (page: React.ReactElement) => (
  <MainLayout>{page}</MainLayout>
)

function DashboardProfilePage() {
  return (
    <>
      <Head>
        <title>آزمون و مدرک - نماتک</title>
      </Head>

      <AExamTakingView />
    </>
  )
}

export default DashboardProfilePage
