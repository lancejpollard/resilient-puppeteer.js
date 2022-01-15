
const puppeteer = require('puppeteer-extra')
// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth')

puppeteer.use(StealthPlugin())

const resilient = {
  browser: null,
  page: null,

  wait(ms) {
    return new Promise((res) => setTimeout(res, ms))
  },

  /**
   * resilient.launch({ headless: true, session: './session' })
   */

  async launch({
    headless = true,
    session,
    proxy,
    username,
    password,
    maxRetryAttempts = 5,
  } = {}) {
    const config = { headless, args: [] }

    if (session) {
      config.userDataDir = session
    }

    if (proxy) {
      config.args.push(`--proxy-server=${proxy}`)
    }

    log('creating browser')
    const browser = this.browser = await puppeteer.launch(config)
    log('created browser')

    log('creating page')
    const page = this.page = await browser.newPage()
    log('created page')

    if (username && password) {
      log('authenticating')
      await page.authenticate({
        username: config.username,
        password: config.password,
      })
      log('authenticated')
    } else {
      log('skipping authentication')
    }

    // save for later.
    this.settings = {
      headless,
      session,
      proxy,
      username,
      password,
      maxRetryAttempts,
    }

    return browser
  },

  async visit(url, attempt = 1) {
    const { browser, page, maxRetryAttempts: max } = this

    if (max && attempt > max) {
      log(`abandoning ${url}`)
      return
    }

    if (attempt === 1) {
      log(`visit ${url}`)
    } else {
      log(`try ${attempt} ${url}`)
    }

    try {
      return await page.goto(url, { waitUntil: 'domcontentloaded' })
    } catch (e) {
      log(e)
      await browser.close()
      await this.launch(this.settings)
      await this.visit(url, attempt + 1)
    }
  },

  async evaluate(fn) {
    return await this.page.evaluate(fn)
  },

  async close() {
    log('closing browser')
    const result = await this.browser.close()
    log('closed browser')
    this.browser = null
    this.page = null
    return result
  }
}

module.exports = resilient

function log(message) {
  console.log(`resilient: ${message}`)
}
