import { roleCan } from "../../src/app/utils/authorizationMatrix";

describe("authorizationMatrix (DOMAIN.md §14)", () => {
  it("READER só lê", () => {
    expect(roleCan("READER", "READ")).toBe(true);
    expect(roleCan("READER", "WRITE")).toBe(false);
    expect(roleCan("READER", "MANAGE_MEMBERS")).toBe(false);
    expect(roleCan("READER", "RENAME_OR_DELETE_PELADA")).toBe(false);
  });

  it("ADMIN escreve dados mas não gerencia membros nem renomeia/exclui a pelada", () => {
    expect(roleCan("ADMIN", "READ")).toBe(true);
    expect(roleCan("ADMIN", "WRITE")).toBe(true);
    expect(roleCan("ADMIN", "MANAGE_MEMBERS")).toBe(false);
    expect(roleCan("ADMIN", "RENAME_OR_DELETE_PELADA")).toBe(false);
  });

  it("OWNER pode tudo", () => {
    expect(roleCan("OWNER", "READ")).toBe(true);
    expect(roleCan("OWNER", "WRITE")).toBe(true);
    expect(roleCan("OWNER", "MANAGE_MEMBERS")).toBe(true);
    expect(roleCan("OWNER", "RENAME_OR_DELETE_PELADA")).toBe(true);
  });
});
