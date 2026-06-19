const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'database.xlsx');

if (!fs.existsSync(FILE_PATH)) {
    console.log("File not found");
    process.exit(1);
}

const wb = xlsx.readFile(FILE_PATH);
console.log("Sheet Names:", wb.SheetNames);

wb.SheetNames.forEach(name => {
    const data = xlsx.utils.sheet_to_json(wb.Sheets[name]);
    console.log(`\nSheet: ${name}`);
    console.log(data);
});
