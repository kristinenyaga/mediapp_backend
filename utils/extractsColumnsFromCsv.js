import fs from 'fs'
import csv from 'csv-parser'

export const extractColumnsFromCsv = (filepath) => {
  return new Promise((resolve, reject) => {
    const columns = []
    
    fs.createReadStream(filepath)
      .pipe(csv())
      .on('headers', (headers) => {
      resolve(headers)
      })
      .on('error', (err) => reject(err))
    
  })
}

(async () => {
  const filepath = "/home/kristine/Downloads/symbipredict_2022.csv";
  try {
    const columns = extractColumnsFromCsv(filepath)
    console.log('columns',columns)
  } catch (error) {
    console.log('error reading file',error)
  }
})()