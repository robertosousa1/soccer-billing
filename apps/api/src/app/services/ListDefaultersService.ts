import { GetMonthlyReportService } from "./GetMonthlyReportService";

export class ListDefaultersService {
  async execute(peladaId: string, competencia: string) {
    const report = await new GetMonthlyReportService().execute(peladaId, competencia);
    return report.inadimplentes;
  }
}
