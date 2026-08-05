import { forwardRef } from 'react'
import Input from '../Input/Input'
import styles from './SearchInput.module.css'

// Campo de busca usado nas barras de filtro (.toolbar input[type=text] no
// original — texto simples, sem ícone, exatamente como a tela atual).
const SearchInput = forwardRef(function SearchInput({ className = '', ...props }, ref) {
  return <Input ref={ref} type="text" className={`${styles.search} ${className}`} {...props} />
})

export default SearchInput
