import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

type AppRenderOptions = RenderOptions & {
  route?: string;
};

function Providers({ children, route = "/" }: { children: ReactNode; route?: string }) {
  return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
}

export function renderWithProviders(ui: ReactElement, options: AppRenderOptions = {}) {
  const { route, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => <Providers route={route}>{children}</Providers>,
    ...renderOptions,
  });
}
