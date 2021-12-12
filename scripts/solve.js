const wall = '#'
const colors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const empty = '-'

export function board_string_to_matrix(strBoard) {
  return strBoard.split('\n').map((row) => row.split(''))
}

export function is_complete_board(board) {
  return board.every((row, y) => row.every((cell, x) => (wall + colors).includes(cell)));
}

export function is_valid_board(board) {
}
