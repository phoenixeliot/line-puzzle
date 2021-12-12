export function dedent(template) {
  return template[0].trim().split('\n').map((line) => line.trimStart()).join('\n')
}
