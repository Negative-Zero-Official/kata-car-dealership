import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, test } from 'vitest'
import App from './App'

afterEach(() => localStorage.clear())

test('renders the home page', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Car Dealership' })).toBeInTheDocument()
})

test('visiting / while signed out redirects to /login', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
})
