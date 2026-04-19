const mammoth = require('mammoth');
const xlsx = require('xlsx');

async function extract() {
  console.log('--- EXTRACTING DOCX ---');
  try {
    const result = await mammoth.extractRawText({path: './PARTE 2 jabel.docx'});
    console.log(result.value.substring(0, 3000));
  } catch (e) {
    console.error('Error DOCX:', e.message);
  }

  console.log('--- EXTRACTING XLSX ---');
  try {
    const workbook = xlsx.readFile('./PLANTILLA HOMBRES NICO (1).xlsx');
    const sheetNames = workbook.SheetNames;
    console.log('Available Sheets:', sheetNames);
    
    // Process first 3 sheets to get an idea of the structure
    for (const name of sheetNames.slice(0, 5)) {
      console.log('\n>>> Sheet:', name);
      const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[name]);
      // Print first 2000 chars of each
      console.log(csv.substring(0, 2000));
    }
  } catch (e) {
    console.error('Error XLSX:', e.message);
  }
}
extract();
