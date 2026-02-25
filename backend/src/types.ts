export interface TemplateData {
  // Document Metadata
  documentName?: string
  templatePath?: string
  
  // Vehicle Information
  vehiclename?: string
  plate1?: string
  vin1?: string
  make1?: string
  model1?: string
  year?: string
  color?: string
  car?: string
  number?: string
  body?: string
  
  // Additional Vehicle Info
  plate2?: string
  plate3?: string
  vin2?: string
  vin3?: string
  make2?: string
  model2?: string
  
  // Dates and Expirations
  date1?: string
  date2?: string
  exp1?: string
  exp2?: string
  exp3?: string
  
  // Owner Information
  first?: string
  last?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  
  // Insurance Information
  ins?: string
  policy?: string
} 