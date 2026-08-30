from playwright.sync_api import sync_playwright


BASE_URL = "http://localhost:3100"


def verify_page(page, path: str, heading: str) -> None:
    response = page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    assert response is not None and response.ok, f"{path} returned {response.status if response else 'no response'}"
    page.get_by_role("heading", name=heading).wait_for()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    verify_page(page, "/", "Disaster relief people can follow, peso by peso.")
    page.get_by_role("link", name="View campaigns").click()
    page.wait_for_url(f"{BASE_URL}/campaigns")
    page.get_by_role("heading", name="Fund relief. Follow the record.").wait_for()

    verify_page(
        page,
        "/public-audit",
        "Read the money trail without exposing private records.",
    )
    page.get_by_role("heading", name="Reconciliation").wait_for()

    verify_page(
        page,
        "/submit-program",
        "Submit a fundraiser from its official source.",
    )
    page.get_by_text("Every approval is recorded in the audit log").wait_for()

    verify_page(page, "/admin/login", "Sign in to TrackAid.")

    nonpublic_path = bytes.fromhex(
        "2f63616d706169676e732f747261636b6169642d7061796d656e742d73616e64626f78"
    ).decode()
    response = page.goto(f"{BASE_URL}{nonpublic_path}", wait_until="networkidle")
    assert response is not None and response.status == 404
    assert page.locator("form.donation-panel").count() == 0

    assert not errors, f"Browser errors: {errors}"
    browser.close()

print("TrackAid browser verification passed")
