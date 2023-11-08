const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const inputJson = require('./input.json'); // Assuming input.json is in the same directory as this script
const fs = require('fs').promises;
const path = require('path');

puppeteer.use(StealthPlugin())

const {executablePath} = require('puppeteer')
const GLASSDOOR_USERNAME = 'notmubashar@gmail.com'
const GLASSDOOR_PASSWORD = 'Yar@62146'
const url = 'https://www.glassdoor.com/index.htm'
const BROWSERLESS_API_KEY = "e57b59a1-7ff4-4eb2-b8b3-68c6f8a89818";



const openInterviewsLinks = async (page) => {
  for (const company of inputJson) {
    const { interviewsLink } = company;
    await page.goto(interviewsLink);
    const randomWaitTime = Math.random() * 3000 + 1000; // Random wait between 1 to 4 seconds
    await page.waitForTimeout(randomWaitTime);
    // Add some waiting time here to ensure the page is loaded
    await page.waitForTimeout(4000); // You can adjust the waiting time as needed
    let interviewsData = await scrapeInterviewRows(page);

  // Continue to click on the pagination button and scrape data from subsequent pages
  try {
    for (let i = 0; i < 5; i++) {
      const hasNextPage = await clickNextButton(page);
      if (hasNextPage) {
        const nextInterviewsData = await scrapeInterviewRows(page);
        interviewsData = interviewsData.concat(nextInterviewsData);
      } else {
        break; // Stop if there are no more pages to scrape
      }
      await page.waitForTimeout(2000);
    }

    const faqData = await scrapeFaq(page);
    interviewsData = interviewsData.concat(faqData);
    const interviewStats = await scrapeInterviewStats(page);
    interviewsData = interviewsData.concat(interviewStats);
  }

  catch (e) {
    console.log(e);
  }
  

  // This data for this object is stored in a folder called data with the company.id named as filename as json
  // Store the interviewsData in JSON format with company ID as the filename
  const dataFolderPath = path.join(__dirname, 'data');
  const filename = `${company.id}.json`;
  const filePath = path.join(dataFolderPath, filename);

  try {
    // Create the "data" folder if it doesn't exist
    await fs.mkdir(dataFolderPath, { recursive: true });

    // Write the interviewsData to the JSON file
    await fs.writeFile(filePath, JSON.stringify(interviewsData, null, 2));

    console.log(`Data for company ${company.id} is stored in ${filePath}`);
  } catch (error) {
    console.error(`Error while storing data for company ${company.id}:`, error);
  }
  }
};

const scrapeInterviewStats = async (page) => {
  const interviewStats = await page.evaluate(() => {
    const statsContainer = document.querySelector('[data-test="IntervewDataOverviewDesktopWrap"]');
    const experienceStats = statsContainer.querySelector('[data-test="InterviewStatChartexperienceStatsContainer"]');
    const gettingInterviewStats = statsContainer.querySelector('[data-test="InterviewStatChartsourceStatsContainer"]');
    const difficultyStat = statsContainer.querySelector('[data-test="InterviewDifficulty"]');

    const experience = {
      positive: experienceStats.children[0].textContent.trim(),
      negative: experienceStats.children[1].textContent.trim(),
      neutral: experienceStats.children[2].textContent.trim(),
    };

    const gettingInterview = {
      "Applied online": gettingInterviewStats.children[0].textContent.trim(),
      "Recruiter": gettingInterviewStats.children[1].textContent.trim(),
      "Employee Referral": gettingInterviewStats.children[2].textContent.trim(),
    };

    const difficulty = difficultyStat.querySelector('.css-155sv15').textContent.trim();

    return { experience, gettingInterview, difficulty };
  });

  return {stats: interviewStats};
};


const scrapeFaq = async (page) => {
  const faqData = await page.evaluate(() => {
    const faqQuestions = document.querySelectorAll('[data-test="interviews-faq-question"]');
    const faqDataArray = [];

    for (const question of faqQuestions) {
      const questionTextElement = question.querySelector('[data-test="accordion-header"]');
      const questionText = questionTextElement?.textContent.trim() || '';

      const answerTextElement = question.querySelector('[data-test="accordion-body"] > p');
      let answerText = '';
      if (answerTextElement) {
        // Sanitize the answer text by using innerText to extract plain text
        answerText = answerTextElement.innerText.trim();
      }

      faqDataArray.push({
        questionText,
        answerText,
      });
    }

    return faqDataArray;
  });

  return { faq: faqData };
};


const scrapeInterviewRows = async (page) => {
  const pageData = await page.evaluate(() => {
    const interviews = document.querySelectorAll('.row');
    const interviewsData = [];

    for (const interview of interviews) {
      const position = interview.querySelector('[data-test*="Title"] > a')?.textContent.trim() || '';
      const intervieweeSubtext = interview.querySelector('[data-test*="CandidateSubtext"]')?.textContent.trim() || '';

      
      const ratingElements = interview.querySelectorAll('[data-test*="Rating"] > div > span.mb-xxsm');

      const offerLink = ratingElements[0] ? {
        text: ratingElements[0].textContent.trim(),
        svgLink: ratingElements[0].previousElementSibling.getAttribute('xmlns') || '',
      } : { text: '', svgLink: '' };

      const experienceLink = ratingElements[1] ? {
        text: ratingElements[1].textContent.trim(),
        svgLink: ratingElements[1].previousElementSibling.getAttribute('xmlns') || '',
      } : { text: '', svgLink: '' };

      const averageInterviewLink = ratingElements[2] ? {
        text: ratingElements[2].textContent.trim(),
        svgLink: ratingElements[2].previousElementSibling.getAttribute('xmlns') || '',
      } : { text: '', svgLink: '' };

      const applicationDetails = interview.querySelector('[data-test*="ApplicationDetails"] > p')?.textContent.trim() || '';
      const interviewProcess = interview.querySelector('[data-test*="Process"]')?.textContent.trim() || '';

      const interviewQuestionsContainer = interview.querySelector('[data-test*="QuestionsContainer"]');
      const interviewQuestions = [];
      if (interviewQuestionsContainer) {
        const questions = interviewQuestionsContainer.querySelectorAll('[data-test*="Questions"] > li');
        for (const question of questions) {
          const questionText = question.querySelector('span.d-inline-block.mb-sm')?.textContent.trim() || '';
          const questionLink = question.querySelector('a.strong.css-12cchq2.e151mjlk0')?.getAttribute('href') || '';
          interviewQuestions.push({ questionText, questionLink });
        }
      }

      interviewsData.push({
        position,
        intervieweeSubtext,
        offerLink,
        experienceLink,
        averageInterviewLink,
        applicationDetails,
        interviewProcess,
        interviewQuestions,
      });
    }

    return interviewsData;
  });

  return pageData;
};
const clickNextButton = async (page) => {
    const nextButton = await page.$("#EmployerInterviews > div.d-flex.flex-column.align-items-top.mt-std.mt-md-0.mb-std > div > div.pageContainer > button.nextButton.css-1iiwzeb.e13qs2072");
    if (nextButton) {
      await nextButton.click();
      const randomWaitTime = Math.random() * 3000 + 1000; // Random wait between 1 to 4 seconds
    await page.waitForTimeout(randomWaitTime);
      await page.waitForTimeout(3000); // Wait for the page to load after clicking the button
      return true;
    }
    return false;
  };

const main = async () => {
  // const browser = await puppeteer.connect({
  //   browserWSEndpoint: `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`,
  //   // browserWSEndpoint: `wss://${auth}@brd.superproxy.io:9222`
  // });
    const browser = await puppeteer.launch({ headless: 'new', executablePath: executablePath()})
    const page = await browser.newPage()


    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();

      // Example: Block unnecessary resources like images and stylesheets
      if (resourceType === 'image' || resourceType === 'stylesheet') {
        request.abort(); // Abort the request
      } else {
        request.continue(); // Continue the request
      }
    });

    // Login Process
    await page.goto(url)
    await page.type('#inlineUserEmail', GLASSDOOR_USERNAME)
    await page.waitForTimeout(5000)
    await page.click('form[name="emailForm"] button[type="submit"]');
    await page.waitForTimeout(5000)
    await page.type("#inlineUserPassword", GLASSDOOR_PASSWORD);
    await page.waitForTimeout(5000)
    await page.click('form[name="authEmailForm"] button[type="submit"]');
    await page.waitForTimeout(5000); // Adjust the waiting time if necessary

    // Call the function to open interviews links
    await openInterviewsLinks(page);
    

    
    await browser.close()
}

main()
