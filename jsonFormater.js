const fs = require('fs');
const path = require('path');

const dataFolderPath = './data';

// Function to process and filter JSON data
function processJsonData(data) {
  const faq = data.find((item) => item.hasOwnProperty('faq'));
  const stats = data.find((item) => item.hasOwnProperty('stats'));

  const interviews = data.filter((item) => item.hasOwnProperty('position') && item.position !== '');

  return { interviews, faq, stats };
}

// Read and process each JSON file in the "data" folder
fs.readdir(dataFolderPath, (err, files) => {
  if (err) {
    console.error('Error reading data folder:', err);
    return;
  }

  files.forEach((file) => {
    if (path.extname(file) === '.json') {
      const filePath = path.join(dataFolderPath, file);
      fs.readFile(filePath, 'utf8', (err, jsonData) => {
        if (err) {
          console.error(`Error reading file ${filePath}:`, err);
          return;
        }

        try {
          const data = JSON.parse(jsonData);
          const processedData = processJsonData(data);
          const updatedJsonData = JSON.stringify(processedData, null, 2);

          fs.writeFile(filePath, updatedJsonData, 'utf8', (err) => {
            if (err) {
              console.error(`Error writing to file ${filePath}:`, err);
              return;
            }

            console.log(`File ${filePath} processed and updated successfully.`);
          });
        } catch (parseError) {
          console.error(`Error parsing JSON data in file ${filePath}:`, parseError);
        }
      });
    }
  });
});
