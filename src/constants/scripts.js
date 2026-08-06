export const SCRIPT_CATEGORIAS = [
  'Windows',
  'PowerShell',
  'Rede',
  'Impressoras',
  'Backup',
  'Limpeza',
  'Instalação',
  'Segurança',
  'Automação',
]

export const SCRIPT_TIPOS = ['BAT', 'CMD', 'PS1', 'REG', 'VBS', 'ZIP', 'Outro']

export const SCRIPT_SORT_OPTIONS = [
  { value: 'nome', label: 'Ordenar por nome' },
  { value: 'categoria', label: 'Ordenar por categoria' },
  { value: 'data', label: 'Mais recentes primeiro' },
]

// Prefixos de comentário por tipo de arquivo — usados pelo highlighter leve
// de código em src/utils/scriptHighlight.js.
export const SCRIPT_COMMENT_PREFIX = {
  BAT: ['REM', '::'],
  CMD: ['REM', '::'],
  PS1: ['#'],
  REG: [';'],
  VBS: ["'"],
}

// Palavras-chave destacadas por tipo de arquivo — mesma lista do
// highlightScriptCode() original.
export const SCRIPT_KEYWORDS = {
  BAT: [
    'echo',
    'if',
    'else',
    'for',
    'goto',
    'call',
    'exit',
    'set',
    'pause',
    'cls',
    'rem',
    'setlocal',
    'endlocal',
  ],
  CMD: [
    'echo',
    'if',
    'else',
    'for',
    'goto',
    'call',
    'exit',
    'set',
    'pause',
    'cls',
    'rem',
    'setlocal',
    'endlocal',
  ],
  PS1: [
    'function',
    'param',
    'foreach',
    'while',
    'if',
    'else',
    'elseif',
    'return',
    'try',
    'catch',
    'finally',
    'write-host',
    'write-output',
    'get-service',
    'get-process',
    'new-item',
    'remove-item',
    'set-location',
  ],
  REG: [
    'windows registry editor version 5.00',
    'hkey_local_machine',
    'hkey_current_user',
    'hkey_classes_root',
    'dword',
    'string',
  ],
  VBS: [
    'dim',
    'set',
    'if',
    'then',
    'else',
    'end if',
    'function',
    'sub',
    'end sub',
    'msgbox',
    'wscript',
    'on error resume next',
  ],
}
