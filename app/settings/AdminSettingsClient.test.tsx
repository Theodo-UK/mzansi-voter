import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminSettingsClient } from "./AdminSettingsClient";

describe("AdminSettingsClient", () => {
  it("keeps admin controls visible to admins", () => {
    const html = renderToStaticMarkup(
      <AdminSettingsClient
        isAdmin
        groupId="group-one"
        groupName="Cape Town"
        displayName="Office Admin"
        currentEmail="admin@theodo.com"
        initialAdminEmails={["admin@theodo.com"]}
      />,
    );

    expect(html).toContain("Admin access");
    expect(html).toContain("Release notes");
  });

  it("shows release notes without admin controls to members", () => {
    const html = renderToStaticMarkup(
      <AdminSettingsClient
        isAdmin={false}
        groupId="group-one"
        groupName="Cape Town"
        displayName="Office Member"
        currentEmail="member@theodo.com"
        initialAdminEmails={[]}
      />,
    );

    expect(html).toContain("Release notes");
    expect(html).toContain("Comments on every item");
    expect(html).not.toContain("Admin access");
  });
});
