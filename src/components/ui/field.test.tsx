import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { Field } from "@/components/ui/field";
import { validateCpf } from "@/lib/validations";
import { maskCpf } from "@/lib/masks";

function ControlledField(props: { validate?: (value: string) => string | null; mask?: (value: string) => string }) {
  const [value, setValue] = useState("");
  return (
    <Field
      id="cpf"
      label="CPF"
      mask={props.mask}
      onChange={setValue}
      validate={props.validate}
      value={value}
    />
  );
}

describe("Field", () => {
  it("nao mostra erro antes de tocar o campo", () => {
    render(<ControlledField validate={validateCpf} />);
    expect(screen.queryByText("CPF inválido.")).not.toBeInTheDocument();
  });

  it("mostra erro ao sair do campo com valor invalido", async () => {
    const user = userEvent.setup();
    render(<ControlledField validate={validateCpf} />);

    const input = screen.getByLabelText("CPF");
    await user.type(input, "123");
    await user.tab();

    expect(screen.getByText("CPF inválido.")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("aplica a mascara ao digitar", async () => {
    const user = userEvent.setup();
    render(<ControlledField mask={maskCpf} />);

    const input = screen.getByLabelText("CPF");
    await user.type(input, "12345678901");

    expect(input).toHaveValue("123.456.789-01");
  });
});
