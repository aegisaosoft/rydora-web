/*
 *
 * Copyright (c) 2025 Alexander Orlov.
 * 34 Middletown Ave Atlantic Highlands NJ 07716
 *
 * THIS SOFTWARE IS THE CONFIDENTIAL AND PROPRIETARY INFORMATION OF
 * Alexander Orlov. ("CONFIDENTIAL INFORMATION"). YOU SHALL NOT DISCLOSE
 * SUCH CONFIDENTIAL INFORMATION AND SHALL USE IT ONLY IN ACCORDANCE
 * WITH THE TERMS OF THE LICENSE AGREEMENT YOU ENTERED INTO WITH
 * Alexander Orlov.
 *
 * Author: Alexander Orlov Aegis AO Soft
 *
 */

// NYC Parking Violations API Client - TypeScript

// Types and Interfaces - Based on actual Socrata API response
interface ParkingViolation {
  plate: string;
  state: string;
  license_type: string;
  summons_number: string;
  issue_date: string;
  violation_time: string;
  violation: string;
  judgment_entry_date: string;
  fine_amount: string;
  penalty_amount: string;
  interest_amount: string;
  reduction_amount: string;
  payment_amount: string;
  amount_due: string;
  precinct: string;
  county: string;
  issuing_agency: string;
  violation_status: string;
  summons_image: string;
}

interface QueryParams {
  $limit?: number;
  $offset?: number;
  $where?: string;
  $order?: string;
  $select?: string;
  $$app_token?: string;
}

interface ViolationSummary {
  plate: string;
  total_violations: number;
  total_fine: number;
  total_penalty: number;
  total_interest: number;
  total_reduction: number;
  total_paid: number;
  total_due: number;
}

// interface ApiResponse {
//   violations: ParkingViolation[];
//   total_count: number;
//   has_more: boolean;
// }

// Main API Client Class
class NYCParkingViolationsAPI {
  private readonly baseUrl = 'https://data.cityofnewyork.us/resource/nc67-uf89.json';
  private readonly appToken?: string;

  constructor(appToken?: string) {
    this.appToken = appToken;
  }

  /**
   * Get parking violations for a list of license plates
   */
  async getViolationsForPlates(
    licensePlates: string[],
    options: {
      limit?: number;
      offset?: number;
      violationYear?: string;
      dateFrom?: string;
      dateTo?: string;
      violationCodes?: string[];
      orderBy?: string;
    } = {}
  ): Promise<ParkingViolation[]> {
    const { limit = 1000, offset = 0, violationYear, dateFrom, dateTo, violationCodes, orderBy } = options;

    // Create WHERE clause for multiple plates
    // Sanitize plates to remove any special characters that might break the query
    const sanitizedPlates = licensePlates
      .map(plate => plate.toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(plate => plate.length > 0);
    
    
    if (sanitizedPlates.length === 0) {
      return [];
    }
    
    const platesCondition = sanitizedPlates
      .map(plate => `plate='${plate}'`)
      .join(' OR ');

    let whereClause = `(${platesCondition})`;

    // Add date range filter if specified (preferred over year filter)
    if (dateFrom && dateTo) {
      // Handle MM/DD/YYYY format - convert to proper Socrata date format
      const convertToSocrataDate = (dateStr: string) => {
        // If already in YYYY-MM-DD format, convert to MM/DD/YYYY for Socrata
        if (dateStr.includes('/')) {
          // Already in MM/DD/YYYY format
          return dateStr;
        } else {
          // Convert from YYYY-MM-DD to MM/DD/YYYY
          const [year, month, day] = dateStr.split('-');
          return `${month}/${day}/${year}`;
        }
      };

      const socrataDateFrom = convertToSocrataDate(dateFrom);
      const socrataDateTo = convertToSocrataDate(dateTo);
      
      whereClause += ` AND issue_date >= '${socrataDateFrom}' AND issue_date <= '${socrataDateTo}'`;
    } else if (violationYear) {
      // Fallback to year filter if no date range specified
      whereClause += ` AND date_extract_y(issue_date)=${violationYear}`;
    }

    // Add violation codes filter if specified
    if (violationCodes && violationCodes.length > 0) {
      const codesCondition = violationCodes
        .map(code => `'${code}'`)
        .join(',');
      whereClause += ` AND violation_code IN (${codesCondition})`;
    }

    const params: QueryParams = {
      $limit: Math.min(limit, 50000), // Socrata limit
      $offset: offset,
      $where: whereClause,
    };

    if (orderBy) {
      params.$order = orderBy;
    }

    if (this.appToken) {
      params.$$app_token = this.appToken;
    }

    try {
      const url = this.buildUrl(params);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Socrata API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data: ParkingViolation[] = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching violations:', error);
      console.error('URL that failed:', this.buildUrl(params));
      throw error;
    }
  }

  /**
   * Get ALL violations for plates with automatic pagination
   */
  async getAllViolationsForPlates(
    licensePlates: string[],
    options: {
      violationYear?: string;
      violationCodes?: string[];
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<ParkingViolation[]> {
    const { violationYear, violationCodes, onProgress } = options;
    const allViolations: ParkingViolation[] = [];
    let offset = 0;
    const limit = 50000; // Maximum per request


    while (true) {
      const violations = await this.getViolationsForPlates(licensePlates, {
        limit,
        offset,
        violationYear,
        violationCodes,
        orderBy: 'issue_date DESC'
      });

      if (violations.length === 0) {
        break;
      }

      allViolations.push(...violations);
      
      if (onProgress) {
        onProgress(allViolations.length, allViolations.length + violations.length);
      }


      // If we got less than the limit, we're done
      if (violations.length < limit) {
        break;
      }

      offset += limit;
      
      // Be nice to the API
      await this.sleep(100);
    }

    return allViolations;
  }

  /**
   * Get violations summary by plate
   */
  async getViolationsSummary(licensePlates: string[]): Promise<ViolationSummary[]> {
    const violations = await this.getAllViolationsForPlates(licensePlates);
    
    if (violations.length === 0) {
      return [];
    }

    // Group by plate_id and calculate summaries
    const summaryMap = new Map<string, ViolationSummary>();

    violations.forEach(violation => {
      const plate = violation.plate;
      
      if (!summaryMap.has(plate)) {
        summaryMap.set(plate, {
          plate: plate,
          total_violations: 0,
          total_fine: 0,
          total_penalty: 0,
          total_interest: 0,
          total_reduction: 0,
          total_paid: 0,
          total_due: 0,
        });
      }

      const summary = summaryMap.get(plate)!;
      summary.total_violations++;
      summary.total_fine += this.parseAmount(violation.fine_amount);
      summary.total_penalty += this.parseAmount(violation.penalty_amount);
      summary.total_interest += this.parseAmount(violation.interest_amount);
      summary.total_reduction += this.parseAmount(violation.reduction_amount);
      summary.total_paid += this.parseAmount(violation.payment_amount);
      summary.total_due += this.parseAmount(violation.amount_due);
    });

    return Array.from(summaryMap.values())
      .map(summary => ({
        ...summary,
        total_fine: Math.round(summary.total_fine * 100) / 100,
        total_penalty: Math.round(summary.total_penalty * 100) / 100,
        total_interest: Math.round(summary.total_interest * 100) / 100,
        total_reduction: Math.round(summary.total_reduction * 100) / 100,
        total_paid: Math.round(summary.total_paid * 100) / 100,
        total_due: Math.round(summary.total_due * 100) / 100,
      }));
  }

  /**
   * Get violations by specific criteria with custom SoQL query
   */
  async getViolationsCustomQuery(
    query: string,
    limit: number = 1000,
    offset: number = 0
  ): Promise<ParkingViolation[]> {
    const params: QueryParams = {
      $limit: Math.min(limit, 50000),
      $offset: offset,
      $where: query,
    };

    if (this.appToken) {
      params.$$app_token = this.appToken;
    }

    try {
      const response = await fetch(this.buildUrl(params));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching violations with custom query:', error);
      throw error;
    }
  }

  // Helper methods
  private buildUrl(params: QueryParams): string {
    const url = new URL(this.baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value.toString());
      }
    });

    return url.toString();
  }

  private parseAmount(amount: string | undefined): number {
    if (!amount || amount === '') return 0;
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Utility Functions
class ViolationAnalyzer {
  static formatViolationsReport(violations: ParkingViolation[]): string {
    if (violations.length === 0) {
      return "No violations found.";
    }

    const report: string[] = [];
    report.push("NYC PARKING VIOLATIONS REPORT");
    report.push("=".repeat(40));

    // Group by plate
    const plateGroups = this.groupBy(violations, 'plate');

    Object.entries(plateGroups).forEach(([plate, plateViolations]) => {
      const totalDue = plateViolations.reduce(
        (sum, v) => sum + this.parseAmount(v.amount_due), 0
      );

      report.push(`\nPlate: ${plate}`);
      report.push(`Total Violations: ${plateViolations.length}`);
      report.push(`Total Amount Due: $${totalDue.toFixed(2)}`);

      // Top violation types
      const violationCounts = this.countBy(plateViolations, 'violation');
      const topViolations = Object.entries(violationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);

      report.push("Top Violations:");
      topViolations.forEach(([violation, count]) => {
        report.push(`  - ${violation}: ${count}`);
      });
    });

    return report.join('\n');
  }

  static getViolationsByLocation(violations: ParkingViolation[]): Record<string, number> {
    // Note: The current API doesn't seem to have street_name, using precinct instead
    return this.countBy(violations, 'precinct');
  }

  static getViolationsByMonth(violations: ParkingViolation[]): Record<string, number> {
    const monthCounts: Record<string, number> = {};
    
    violations.forEach(violation => {
      if (violation.issue_date) {
        const date = new Date(violation.issue_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      }
    });

    return monthCounts;
  }

  private static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private static countBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((counts, item) => {
      const group = String(item[key]);
      counts[group] = (counts[group] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  private static parseAmount(amount: string | undefined): number {
    if (!amount || amount === '') return 0;
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }
}

// Constants
export const COMMON_VIOLATION_CODES = {
  "20": "No Parking (Street Cleaning)",
  "21": "No Parking (Street Cleaning)",
  "14": "No Standing (General)",
  "16": "No Standing (Taxi Stand)",
  "17": "No Parking (Taxi Stand)",
  "19": "No Standing (Bus Stop)",
  "38": "Expired Meter",
  "40": "No Parking (Fire Hydrant)",
  "46": "Double Parking",
  "47": "Double Parking (Midtown)",
  "78": "No Parking (Residents Only)"
} as const;

// Example Usage
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _exampleUsage() {
  // Initialize the client
  const client = new NYCParkingViolationsAPI("YOUR_APP_TOKEN_HERE"); // Optional but recommended

  // List of license plates to search
  const licensePlates = [
    "ABC1234",
    "XYZ5678", 
    "DEF9012",
    "GHI3456"
  ];

  try {
    // Example 1: Get violations for specific plates in 2024
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _violations2024 = await client.getViolationsForPlates(licensePlates, {
      limit: 1000,
      violationYear: "2024"
    });

    // Example 2: Get ALL violations for these plates
    const _allViolations = await client.getAllViolationsForPlates(licensePlates, {
      onProgress: (current, total) => {
      }
    });

    if (_allViolations.length > 0) {
      _allViolations.slice(0, 5).forEach(violation => {
      });
    }

    // Example 3: Get summary by plate
    const summary = await client.getViolationsSummary(licensePlates);
    console.table(summary);

    // Example 4: Custom query - Specific plates
    const customQuery = `plate IN ('ABC1234', 'XYZ5678')`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _customViolations = await client.getViolationsCustomQuery(
      customQuery,
      1000
    );

    // Example 5: Generate report
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _report = ViolationAnalyzer.formatViolationsReport(_allViolations);

    // Example 6: Analyze by location
    const locationAnalysis = ViolationAnalyzer.getViolationsByLocation(_allViolations);
    Object.entries(locationAnalysis)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([location, count]) => {
      });

  } catch (error) {
    console.error("Error in example usage:", error);
  }
}

// Export for use
export {
  NYCParkingViolationsAPI,
  ViolationAnalyzer,
  type ParkingViolation,
  type ViolationSummary,
  type QueryParams
};

// Uncomment to run example
// exampleUsage();
