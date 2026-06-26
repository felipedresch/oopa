import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DatePicker } from "@/components/ui/date-picker";

describe("DatePicker", () => {
  it("mostra o placeholder quando vazio", () => {
    render(<DatePicker onChange={() => {}} value="" />);
    expect(screen.getByText("dd/mm/aaaa")).toBeInTheDocument();
  });

  it("formata o valor ISO como dd/mm/aaaa", () => {
    render(<DatePicker onChange={() => {}} value="2020-03-15" />);
    expect(screen.getByText("15/03/2020")).toBeInTheDocument();
  });

  it("abre o calendario ao clicar e seleciona um dia", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker onChange={onChange} value="2020-03-15" />);

    await user.click(screen.getByText("15/03/2020"));

    const day = await screen.findByRole("button", { name: /10 de mar.o de 2020/i });
    await user.click(day);

    expect(onChange).toHaveBeenCalledWith("2020-03-10");
  });

  it("withTime: exibe data e hora e mantem a hora ao trocar o dia", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DatePicker onChange={onChange} value="2020-03-15T08:30" withTime />);

    expect(screen.getByText("15/03/2020 08:30")).toBeInTheDocument();

    await user.click(screen.getByText("15/03/2020 08:30"));
    const day = await screen.findByRole("button", { name: /10 de mar.o de 2020/i });
    await user.click(day);

    expect(onChange).toHaveBeenCalledWith("2020-03-10T08:30");
  });
});
