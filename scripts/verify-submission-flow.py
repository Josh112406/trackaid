from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:3000"


def wait_for_page(page, path: str) -> None:
    response = page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
    assert response is not None and response.ok, f"{path} returned {response.status if response else 'no response'}"
    page.wait_for_load_state("networkidle")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1100})
    page_errors: list[str] = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))

    wait_for_page(page, "/")
    assert page.locator("header").get_by_role("link", name="Admin", exact=True).count() == 0
    assert page.get_by_role("link", name="Submit a program", exact=True).count() >= 1

    wait_for_page(page, "/campaigns")
    assert page.get_by_role("link", name="Submit a program", exact=True).count() >= 1

    wait_for_page(page, "/submit-program")
    assert page.get_by_role("heading", name="Submit a fundraiser from its official source.").is_visible()
    assert page.get_by_role("heading", name="Sign in to submit").is_visible()
    assert page.get_by_role("textbox", name="Email address").is_visible()
    assert page.get_by_text("Public submissions cannot approve themselves.").is_visible()

    artifact_dir = Path("artifacts")
    artifact_dir.mkdir(exist_ok=True)
    page.screenshot(path=artifact_dir / "submit-program.png", full_page=True)

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    wait_for_page(mobile, "/")
    mobile_submit_link = mobile.locator("header").get_by_role(
        "link", name="Submit a program", exact=True
    )
    assert mobile_submit_link.is_visible()
    assert mobile.locator("header").get_by_role("link", name="Admin", exact=True).count() == 0
    mobile.screenshot(path=artifact_dir / "home-mobile-navigation.png", full_page=True)
    mobile.close()

    assert not page_errors, f"Browser page errors: {page_errors}"
    browser.close()

print("Public submission navigation and sign-in flow verified.")
