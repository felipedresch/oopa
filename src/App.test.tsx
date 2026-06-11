import { render, screen } from "@testing-library/react";

import App from "@/App";

describe("App", () => {
  it("renders the project foundation shell", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /fundacao tecnica pronta/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/npm run quality/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /convex ai docs/i })).toHaveAttribute(
      "href",
      "https://docs.convex.dev/ai",
    );
  });
});
