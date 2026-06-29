import { ParseExtractService } from "../../src/app/services/ParseExtractService";

/**
 * Extrato real do PicPay (ver docs/DOMAIN.md §2): BOM UTF-8, campos entre aspas com vírgula
 * decimal dentro ("+R$ 70,00"), "tipo" com espaço à direita ("Pix enviado ") e o caractere de
 * "-" corrompido por encoding em saídas ("âR$ 930,00" em vez de "-R$ 930,00").
 */
function buildCsvBuffer(): Buffer {
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const body =
    'data,hora,tipo,"origem / destino",valor,"forma de pagamento"\n' +
    '2026-06-08,21:54,"Pix recebido","Marcelo Araujo Rodrigues","+R$ 70,00",\n' +
    '2026-05-16,09:42,"Pix enviado ","IMPACTO ARENA SOCIETY LTDA","âR$ 930,00","Com saldo"\n';
  return Buffer.concat([bom, Buffer.from(body, "utf-8")]);
}

describe("ParseExtractService", () => {
  it("reconhece entradas e saídas de um extrato real do PicPay (BOM, aspas, vírgula decimal, sinal corrompido)", () => {
    const lines = new ParseExtractService().execute(buildCsvBuffer());

    expect(lines).toHaveLength(2);

    expect(lines[0]).toMatchObject({
      data: "2026-06-08",
      hora: "21:54",
      nomeOriginal: "Marcelo Araujo Rodrigues",
      valor: 7000,
      formaPagamento: null,
      competencia: "2026-06",
    });

    expect(lines[1]).toMatchObject({
      data: "2026-05-16",
      hora: "09:42",
      nomeOriginal: "IMPACTO ARENA SOCIETY LTDA",
      valor: -93000,
      formaPagamento: "Com saldo",
      competencia: "2026-05",
    });
  });

  it("descarta linhas sem data, sem nome ou com valor zero", () => {
    const csv = 'data,hora,tipo,"origem / destino",valor,"forma de pagamento"\n,12:00,"Pix recebido","Alguém","R$ 0,00",\n';
    const lines = new ParseExtractService().execute(Buffer.from(csv, "utf-8"));
    expect(lines).toHaveLength(0);
  });
});
