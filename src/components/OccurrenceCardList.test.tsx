import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { OccurrenceCardList } from "@/components/OccurrenceCardList";

describe("OccurrenceCardList", () => {
  it("mostra estado de carregamento quando occurrences é undefined", () => {
    render(
      <MemoryRouter>
        <OccurrenceCardList
          occurrences={undefined}
          onLoadMore={vi.fn()}
          paginationStatus="LoadingFirstPage"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("mostra estado vazio quando não há ocorrências", () => {
    render(
      <MemoryRouter>
        <OccurrenceCardList
          emptyDescription="Nenhuma ocorrência encontrada com os filtros atuais."
          occurrences={[]}
          onLoadMore={vi.fn()}
          paginationStatus="Exhausted"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sem ocorrências")).toBeInTheDocument();
  });

  it("lista ocorrências e aciona carregar mais", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();

    render(
      <MemoryRouter>
        <OccurrenceCardList
          occurrences={[
            {
              _id: "occ1",
              dog_id: "dog1",
              dog_nome: "Luna",
              type_nome: "Resgate na Rua",
              gravidade: "alta",
              data_ocorrencia: Date.UTC(2024, 5, 10),
              descricao: "Animal atropelado",
              bairro_nome: "Centro",
            },
            {
              _id: "occ2",
              type_nome: "Denúncia externa",
              gravidade: "media",
              data_ocorrencia: Date.UTC(2024, 5, 11),
              descricao: "Denúncia sem animal identificado",
              bairro_nome: null,
            },
          ]}
          onLoadMore={onLoadMore}
          paginationStatus="CanLoadMore"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Resgate na Rua")).toBeInTheDocument();
    expect(screen.getByText("Denúncia externa")).toBeInTheDocument();
    expect(screen.getByText("Sem animal vinculado")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /carregar mais/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
