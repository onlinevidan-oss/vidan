"use client";

export function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem("vidan-analytics-consent");
        window.location.reload();
      }}
      className="text-left transition hover:text-lime-500"
    >
      Cookie тохиргоо
    </button>
  );
}
