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
