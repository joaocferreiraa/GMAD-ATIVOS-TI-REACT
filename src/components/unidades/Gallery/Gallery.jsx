import styles from './Gallery.module.css'

// Grade de fotos com abertura em lightbox ao clicar (.gallery/.g-item do
// sistema original). Itens são focáveis e respondem a Enter/Espaço, igual
// ao original (tabindex="0" + keydown).
export default function Gallery({ images, onOpen }) {
  return (
    <div className={styles.gallery}>
      {images.map((img) => (
        <div
          key={img.caption}
          className={styles.item}
          tabIndex={0}
          role="button"
          onClick={() => onOpen(img)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen(img)
            }
          }}
        >
          <img src={img.src} alt={img.alt} loading="lazy" />
          <div className={styles.cap}>
            <b>{img.caption}</b>
            <small>Clique para ampliar</small>
          </div>
        </div>
      ))}
    </div>
  )
}
