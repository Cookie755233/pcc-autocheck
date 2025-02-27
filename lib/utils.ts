import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts an HSL color to an HSLA color
 * @param hsl The HSL color string
 * @param alpha The alpha value (0-1)
 * @returns An HSLA color string
 */
export function hslToHsla(hsl: string, alpha: number): string {
  const hslString = hsl.replace('hsl(', '').replace(')', '');
  return `hsl(${hslString}, ${alpha})`;
}

/**
 * Converts a string to a consistent color
 * @param str The string to convert to a color
 * @param saturation The saturation of the color (0-1)
 * @param darkMode Whether to adjust for dark mode
 * @returns A CSS color string
 */
export function stringToColor(str: string, saturation = 0.5, darkMode = false): string {
  if (!str) return darkMode ? '#555555' : '#eeeeee';
  
  // Generate a hash from the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert hash to a hue (0-360)
  const hue = hash % 360;
  
  // Use HSL for better control over brightness
  const lightness = darkMode ? 50 : 30; // Brighter in dark mode
  
  // Return HSL color
  return `hsl(${hue}, ${Math.floor(saturation * 100)}%, ${lightness}%)`;
}

//@ Helper function to get all winning vendors
export function getWinningVendors(record: any) {
  const vendors = [];
  let vendorIndex = 1;
  const detail = record?.detail || {};
  
  //? Keep checking for vendors until we don't find one
  while (true) {
    const vendorKey = `決標品項:第1品項:得標廠商${vendorIndex}:得標廠商`;
    const vendor = {
      name: detail[vendorKey] || detail[`投標廠商:投標廠商${vendorIndex}:廠商名稱`],
      address: detail[`投標廠商:投標廠商${vendorIndex}:廠商地址`],
      phone: detail[`投標廠商:投標廠商${vendorIndex}:廠商電話`],
      period: detail[`投標廠商:投標廠商${vendorIndex}:履約起迄日期`],
      amount: detail[`投標廠商:投標廠商${vendorIndex}:決標金額`],
      type: detail[`投標廠商:投標廠商${vendorIndex}:組織型態`],
      isSmallBusiness: detail[`投標廠商:投標廠商${vendorIndex}:是否為中小企業`],
      // Additional fields for awarded tenders
      originalAmount: detail[`決標品項:第1品項:得標廠商${vendorIndex}:得標廠商原始投標金額`],
      rank: detail[`決標品項:第1品項:得標廠商${vendorIndex}:評選序位或總評分`],
      participated: detail[`決標品項:第1品項:得標廠商${vendorIndex}:參與評選`],
    };

    if (!vendor.name) break; // Stop if no more vendors found
    vendors.push(vendor);
    vendorIndex++;
  }

  return vendors;
}

//@ Helper to safely serialize data with BigInt
export function serializeData(data: any): any {
  return JSON.parse(JSON.stringify(
    data,
    (key, value) => 
      typeof value === 'bigint' 
        ? Number(value)  // Convert BigInt to number
        : value
  ))
}

export function serializeTenderData(data: any): any {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}