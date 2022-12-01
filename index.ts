import parse, { HTMLElement } from "node-html-parser";
import { Browser, Builder, By, until } from "selenium-webdriver";
import { Options, ServiceBuilder } from "selenium-webdriver/chrome";
import { join } from "path";
import * as fs from "fs";


interface IArticleInfo {
  title: string;
  authors: string;
  link: string;
}

function generateListUrl(page: number = 1) {
  return `https://cyberleninka.ru/search?q=NodeJS&page=${ page }`
}

function parseArticle(article_el: HTMLElement): IArticleInfo {
  const title_el = article_el.querySelector('.title');

  const authors_el = article_el.querySelector('span')

  return {
    title: title_el?.text || '',
    authors: authors_el?.text || '',
    link: 'https://cyberleninka.ru' + title_el?.querySelector('a')?.getAttribute('href') || ''
  }
}

async function parser() {
  console.log('Building...')
  const builder = new Builder()
    .forBrowser(Browser.CHROME)
    .setChromeOptions(
      new Options().addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage').windowSize({
        width: 1920,
        height: 1080
      })
    );

  builder.setChromeService(new ServiceBuilder(join(__dirname, './chromedriver')));

  const driver = await builder.build();

  console.log('Fetching...')
  try {
    let articles: Array<HTMLElement> = [];
    for (const page_num of Array(5).keys()) {
      await driver.get(generateListUrl(page_num + 1));

      /** Ожидаем подгрузки списка статей на страницу */
      await driver.wait(until.elementLocated(By.css('#search-results')), 60000);

      /** Получаем результаты */
      const results = await driver.findElement(By.css('#search-results'));

      const articles_list_html = await results.getAttribute('innerHTML')

      /** Парсим список в HTMLElement */
      const articles_list = parse(articles_list_html)

      /** Получаем статьи */
      articles = articles.concat(articles_list.querySelectorAll('li'))
    }

    const articles_info = articles.map(article => parseArticle(article))
    console.log('Parsed', articles_info.length, 'articles')

    const json = JSON.stringify(articles_info, null, 2);

    await new Promise(resolve => {
      fs.writeFile('articles.json', json, 'utf8', resolve);
    })

    console.log('Wrote to file articles.json')

  } catch (err: any) {
    console.log('Error', err.message, err.stack)

  } finally {
    await driver.quit();
  }
  console.log('Done')
}

// Main
console.log('Starting...');
parser();
