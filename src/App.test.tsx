import { render, screen } from "@testing-library/react";

import App from "@/App";

describe("App", () => {
  it("renderiza o roteamento da aplicacao", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("OOPA")).toBeInTheDocument();
  });
});
