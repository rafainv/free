const { connect } = require("puppeteer-real-browser");
const fs = require("fs");

const COOKIES_PATH = "cookies.json";

const free = async () => {
  const { page, browser } = await connect({
    // args: [
    // "--disable-gpu",
    // "--no-sandbox",
    // "--disable-setuid-sandbox",
    // "--disable-dev-shm-usage",
    // "--disable-extensions",
    // "--disable-images",
    // "--disable-web-security",
    // "--disable-features=IsolateOrigins,site-per-process",
    // ],
    // headless: false,
    // turnstile: true,
    // disableXvfb: false,
    // ignoreAllFlags: false,
    // proxy: proxy.host ? proxy : false,

    args: ["--start-maximized"],
    turnstile: true,
    headless: false,
    // disableXvfb: true,
    customConfig: {},
    connectOption: {
      defaultViewport: null,
    },
    plugins: [],
  });

  try {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (
        url.includes("doubleclick.net") ||
        url.includes("adservice.google.com") ||
        url.includes("googlesyndication.com")
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    if (fs.existsSync(COOKIES_PATH)) {
      const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH));
      await page.setCookie(...cookies);
    }

    await page.goto("https://freebitco.in/", {
      waitUntil: "networkidle2",
    });

    await new Promise((r) => setTimeout(r, 2000)); 

    if ((await page.content()).includes("LOGIN")) {
      await new Promise((r) => setTimeout(r, 5000));
      await page.waitForSelector("li.login_menu_button");
      await page.click("li.login_menu_button");
      await page.waitForSelector('input[name="btc_address"]');
      await page.type('input[name="btc_address"]', "rafaro128@gmail.com");
      await page.waitForSelector("#login_form_password");
      await page.type("#login_form_password", "4d2nvvxocacywG8m");
      await page.waitForSelector("#login_button");
      await page.click("#login_button");
      await page.waitForNavigation({ waitUntil: "networkidle2" });
      await new Promise((r) => setTimeout(r, 5000));
      const cookies = await page.cookies();
      fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
      console.log("Cookies salvos!");
    } else {
      console.log("Já está logado com cookies!");
    }

    await page.evaluate(() => {
      document.body.style.zoom = "45%";
      window.scrollTo(0, document.body.scrollHeight);
    });

    let token = null
    let startDate = Date.now()
    while (!token && (Date.now() - startDate) < 30000) {
        token = await page.evaluate(() => {
            try {
                let item = document.querySelector('[name="cf-turnstile-response"]').value
                return item && item.length > 20 ? item : null
            } catch (e) {
                return null
            }
        })
        await new Promise(r => setTimeout(r, 1000));
    }
    await browser.close()
    assert.strictEqual(token !== null, true, "Cloudflare turnstile test failed!")

    await new Promise((r) => setTimeout(r, 5000));

    // roll
    try {
      await page.waitForFunction(() => {
        const el = document.querySelector("#free_play_form_button");
        if (!el) return null;
        return el.style.display !== "none";
      });
      await new Promise((r) => setTimeout(r, 5000));
      await page.waitForSelector("#free_play_form_button", { visible: true });
      await page.click("#free_play_form_button", { visible: true });
      await new Promise((r) => setTimeout(r, 5000));
      await page.screenshot({ path: "screen.png" });
    } catch (e) {
      await new Promise((r) => setTimeout(r, 5000));
      await page.screenshot({ path: "screen.png" });
      await browser.close();
    }
    await new Promise((r) => setTimeout(r, 5000));
    //await page.screenshot({ path: "screen.png" });
  } catch (error) {
    console.error(`Erro interno do servidor: ${error.message}`);
  } finally {
    await browser.close();
  }
};

free();
