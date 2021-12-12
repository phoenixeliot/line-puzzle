import hex5x5_1 from './fixtures/hex5x5_1.js';
import { dedent } from './utils';
import { board_string_to_matrix, is_complete_board } from '../scripts/solve';

test('solves a basic hex', () => {
  console.log(hex5x5_1)
  debugger
  // expect()
})

describe('board_string_to_matrix', () => {
  it('converts a string board to a matrix board', () => {
    const stringBoard = dedent`
      BYO
      BYO
      BYO
    `
    const matrixBoard = [
      ["B","Y","O"],
      ["B","Y","O"],
      ["B","Y","O"],
    ]
    expect(board_string_to_matrix(stringBoard)).toEqual(matrixBoard);
  });
})

describe('is_complete_board', () => {
  test('it checks if board is completely filled', () => {
    const board = board_string_to_matrix(dedent`
      BYO
      BYO
      BYO
    `)
    expect(is_complete_board(board)).toBeTruthy()
  })
})
