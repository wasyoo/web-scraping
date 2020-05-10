const puppeteer = require('puppeteer');

const hideImageCss = async (page) => {
  await page.setRequestInterception(true);

  page.on('request', (req) => {
    if(req.resourceType() === 'image' || req.resourceType() === 'stylesheet' || req.resourceType() === 'font'){
        req.abort();
    }
    else {
      req.continue();
    }
  });
  return page;
}

const parseResults = async (page) => {
  const companies=[];

  await page.waitForSelector('article.bi-bloc')

  const items = await page.$$('article.bi-bloc')

  for(let item of items) {
    let name = await item.$eval(('a.denomination-links.pj-link'), node => node.innerText.trim());
    let address = await item.$eval(('.adresse-container.noTrad>a.adresse'), node => node.innerText.trim());
    let link = await item.$eval(('.company-name>.denomination-links'), node => node.href);

    let Phone = await (async() => {
      const array = [];
      const phones = await item.$$(('.bi-contact-tel .tel-zone'));
      for(let phone of phones) {
        const text = await page.evaluate(el => el.innerText, phone);
        array.push(text.trim());
      }
      return array;
    })();

    let webSites = await (async()=>{
      const array = [];
      const elements = await item.$$(('.bi-site-internet'));
      if(elements.length) {
        for(let element of elements) {
          const text = await page.evaluate(el => el.innerText.trim(), element);
          if(!text.includes('Facebook')) {
            array.push(text.trim());
          }
        }
      } else {
        const websiteText = await item.$('.site-internet>a');
        if(websiteText) {
          const text = await page.evaluate(el => el.href, websiteText);
          array.push(text.trim());
        }
      }
      return array.length ? array : null;
    })();

    await companies.push({
      name,
      address,
      link,
      Phone,
      webSites
    });
  }

  return companies;
} 

const getResults = async (page) => {
  let companies = [];
  
  do {
    let newCompanies = await parseResults(page);
    console.log('getResults -> newCompanies', newCompanies);
    companies = [...companies, ...newCompanies]; 

    let nextPageButton = await page.$('.pagination .link_pagination.next');

    if(nextPageButton) {
      await nextPageButton.click();
      await page.waitForNavigation({waitUntil: 'networkidle2'});
    } else {
      break;
    }
  } while(true);

  return companies;
}

(async () => {
  try {
    const pagesUrl='https://www.pagesjaunes.fr/annuaire/bourgogne-franche-comte/securite-gardiennage';

    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await hideImageCss(page);

    await page.goto(pagesUrl, {waitUntil: 'networkidle2'});
    
    await getResults(page);
    // console.log(await parseResults(page));

    await browser.close(); 

    console.log("-----------------End--------------")

  } catch(err) {
    console.log(err)
  }
})();
