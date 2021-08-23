import React from 'react'
import Head from 'next/head'
import type { AppProps } from 'next/app'
import type { Session } from 'next-auth'
import { Provider } from 'next-auth/client'

import { GlobalStyles } from 'styles/global'
import 'sanitize.css'
import 'sanitize.css/forms.css'
import 'sanitize.css/typography.css'

import { DefaultLayout } from 'components/layouts'

interface PageProps {
  session: Session
}

const App = ({ Component, pageProps }: AppProps): JSX.Element => {
  return (
    <Provider session={(pageProps as PageProps).session}>
      <GlobalStyles />
      <Head>
        <title>Gitstagram</title>
        <meta name='description' content='Gitstagram' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <DefaultLayout>
        <Component {...pageProps} />
      </DefaultLayout>
    </Provider>
  )
}

export default App
