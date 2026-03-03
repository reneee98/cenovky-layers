import assert from "node:assert/strict";
import test from "node:test";

import {
  buildClientSnapshot,
  buildSupplierSnapshot,
  canCreateInvoiceForClient,
  hasClientBillingIdentity,
} from "../server/invoices/snapshots";

test("invoice snapshots: supplier snapshot cleans optional fields", () => {
  const supplier = buildSupplierSnapshot({
    companyName: "Acme",
    companyAddress: "Street 1",
    companyEmail: "hello@example.com",
    companyPhone: "+421900000000",
    companyIco: " 123 ",
    companyDic: "",
    companyIcdph: undefined,
    companyWebsite: " ",
    companyIban: " SK123 ",
    companySwiftBic: "  ",
    companyRegistrationNote: " note ",
    companySignatureUrl: "",
  });

  assert.deepEqual(supplier, {
    companyName: "Acme",
    companyAddress: "Street 1",
    companyIco: "123",
    companyDic: null,
    companyIcdph: null,
    companyEmail: "hello@example.com",
    companyPhone: "+421900000000",
    companyWebsite: null,
    companyIban: "SK123",
    companySwiftBic: null,
    companyRegistrationNote: "note",
    companySignatureUrl: null,
  });
});

test("invoice snapshots: client snapshot applies billing fallback and display name", () => {
  const companyClient = buildClientSnapshot({
    type: "company",
    name: "Fallback Company",
    billingAddressLine1: "Main 1",
    city: "BA",
    zip: "81101",
    country: "SK",
    contactName: "John",
    contactEmail: "john@example.com",
    companyName: " Acme s.r.o. ",
    billingStreet: " ",
  });

  assert.equal(companyClient.companyName, "Acme s.r.o.");
  assert.equal(companyClient.billingStreet, "Main 1");
  assert.equal(companyClient.displayName, "Acme s.r.o.");
  assert.equal(hasClientBillingIdentity(companyClient), true);

  const personClient = buildClientSnapshot({
    type: "person",
    name: "Fallback Person",
    billingAddressLine1: "Main 1",
    city: "BA",
    zip: "81101",
    country: "SK",
    contactName: "John",
    contactEmail: "john@example.com",
    firstName: "Jane",
    lastName: "Doe",
  });

  assert.equal(personClient.displayName, "Jane Doe");
  assert.equal(canCreateInvoiceForClient(personClient), true);

  const noIdentity = buildClientSnapshot({
    type: "company",
    name: "",
    companyName: "",
    billingAddressLine1: "Main 1",
    city: "BA",
    zip: "81101",
    country: "SK",
    contactName: "John",
    contactEmail: "john@example.com",
  });

  assert.equal(hasClientBillingIdentity(noIdentity), false);
});
