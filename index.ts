/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Browser,
  Page,
  PuppeteerLaunchOptions,
  PuppeteerLifeCycleEvent,
} from 'puppeteer'
import puppeteer from 'puppeteer-extra'
// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

type LaunchOptions = {
  args?: Array<string>
  headless?: boolean
  maxRetryAttempts?: number
  password?: string
  protocolTimeout?: number
  proxy?: string
  session?: string
  username?: string
}

type VisitOptions = {
  attempt?: number
  waitUntil?: PuppeteerLifeCycleEvent
}

type Evaluate = (...args: Array<any>) => any

type Resilient = {
  browser: Browser | null
  close: () => void
  evaluate: (fn: Evaluate | string, ...args: Array<any>) => Promise<any>
  launch: (opts?: LaunchOptions) => Promise<Browser>
  page: Page | null
  settings: LaunchOptions | null
  visit: (url: string, opts?: VisitOptions) => Promise<void>
  wait: (ms: number) => Promise<void>
}

const resilient: Resilient = {
  browser: null,

  async close() {
    log('closing browser')
    if (this.browser) {
      await this.browser.close()
    }
    log('closed browser')
    this.browser = null
    this.page = null
  },

  async evaluate(fn: Evaluate | string, ...args: Array<any>) {
    return await this.page?.evaluate(fn, ...args)
  },

  /**
   * resilient.launch({ headless: true, session: './session' })
   */

  async launch(opts?: LaunchOptions) {
    const {
      headless = true,
      session,
      proxy,
      username,
      password,
      maxRetryAttempts = 5,
      args = [],
      protocolTimeout = 500000,
    } = opts ?? {}
    const config: PuppeteerLaunchOptions = {
      args,
      headless,
      protocolTimeout,
    }

    if (session) {
      config.userDataDir = session
    }

    if (proxy) {
      config.args?.push(`--proxy-server=${proxy}`)
    }

    log('creating browser')
    const browser = (this.browser = await puppeteer.launch(config))
    log('created browser')

    log('creating page')
    const page = (this.page = await browser.newPage())
    log('created page')

    if (username && password) {
      log('authenticating')
      await page.authenticate({
        password,
        username,
      })
      log('authenticated')
    } else {
      log('skipping authentication')
    }

    // save for later.
    this.settings = {
      headless,
      maxRetryAttempts,
      password,
      proxy,
      session,
      username,
    }

    return browser
  },

  page: null,

  settings: null,

  async visit(url: string, opts?: VisitOptions) {
    const { attempt = 1, waitUntil = 'domcontentloaded' } = opts ?? {}
    const { browser, page } = this
    const max = this.settings?.maxRetryAttempts ?? 3

    let atmp = attempt ?? 1
    let until = waitUntil ?? 'domcontentloaded'

    if (max && atmp > max) {
      log(`abandoning ${url}`)
      return
    }

    if (atmp === 1) {
      log(`visit ${url}`)
    } else {
      log(`try ${atmp} ${url}`)
    }

    try {
      await page?.goto(url, { waitUntil: until })
    } catch (e) {
      if (e instanceof Error) {
        log(e.message)
      }
      await this.page?.close()
      await this.browser?.close()
      await this.launch(this.settings as LaunchOptions)
      await this.visit(url, { attempt: atmp + 1, waitUntil: until })
    }
  },

  wait(ms: number) {
    return new Promise(res => setTimeout(res, ms))
  },
}

export default resilient

function log(message: string) {
  console.log(`resilient: ${message}`)
}
