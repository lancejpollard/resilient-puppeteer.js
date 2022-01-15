
# Resilient Puppeteer

By default, on normal real-world web-pages, the Puppeteer library for Node.js will crash for a variety of difficult to describe situations. This just makes it so you can know that your web page rendering script will _eventually_ be successful, recovering from errors and making sure it continues to chug along processing more pages.

Also, we make it easy to add proxy support, as it's sometimes important to add a proxy.

```
npm install @lancejpollard/resilient-puppeteer.js
```

```js
const resilient = require('@lancejpollard/resilient-puppeteer.js')

start()

async function start() {
  await resilient.launch()

  const urls = [...]

  for (let i = 0, n = urls.length; i < n; i++) {
    const url = urls[i]
    // it's not going to crash.
    await resilient.visit(url)
    // it can crash here if your DOM code is incorrect though,
    // but that is what you want.
    const hrefs = await resilient.evaluate(getLinks)
    // insert them to db or something otherwise.
    console.log(hrefs)
    // sometimes it helps to just wait :)
    await resilient.wait(1000)
  }

  await resilient.close()

  function getLinks() {
    const links = {}
    Array.prototype.slice.call(document.querySelectorAll('a')).forEach(a => {
      links[a.href] = true
    })
    return Object.keys(links)
  }
}
```

Can go into headed mode if you want as well.

```js
await resilient.launch({ headless: false })
```

You can use a proxy as well:

```js
const proxy = `https://zproxy.lum-superproxy.io:22225`
const username = `lum-customer-m1_3918c719-zone-zone1`
const password = `cjia091jioa`

await resilient.launch({
  proxy,
  username,
  password
})
```
