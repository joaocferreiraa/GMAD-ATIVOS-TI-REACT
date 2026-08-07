import { useState } from 'react'
import Card from '../../components/ui/Card/Card'
import Gallery from '../../components/unidades/Gallery/Gallery'
import Lightbox from '../../components/unidades/Lightbox/Lightbox'
import { MADVILLE_IMAGES, CURITIBA_IMAGES } from './galleryImages'
import { LOCATIONS } from './locations'
import styles from './UnidadesPage.module.css'

const LOC_TAG_CLASS = {
  madville: 'locTagMadville',
  curitiba: 'locTagCuritiba',
}

// Tela "Nossas unidades" — conteúdo 100% estático no sistema original
// (galeria de fotos + endereços/mapas de 2 unidades), sem CRUD, sem relação
// com o cadastro de Ativos.
export default function UnidadesPage() {
  const [lightboxImage, setLightboxImage] = useState(null)

  return (
    <div>
      <div className={styles.heading}>
        <h2>Nossas unidades</h2>
        <p>Conheça elas.</p>
      </div>

      <Card className={styles.galleryCard}>
        <h3>GMAD Madville — Loja, CD e Soluções</h3>
        <Gallery images={MADVILLE_IMAGES} onOpen={setLightboxImage} />
      </Card>

      <Card className={styles.galleryCard}>
        <h3>GMAD Curitiba</h3>
        <Gallery images={CURITIBA_IMAGES} onOpen={setLightboxImage} />
      </Card>

      <div className={styles.locationsGrid}>
        {LOCATIONS.map((loc) => (
          <div key={loc.id} className={styles.locationCard}>
            <span className={`${styles.locTag} ${styles[LOC_TAG_CLASS[loc.id]]}`}>{loc.tag}</span>
            <h3>Nossa localização</h3>
            <p>{loc.address}</p>
            <div className={styles.mapEmbed}>
              <iframe
                src={loc.mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={loc.mapTitle}
              />
            </div>
          </div>
        ))}
      </div>

      <Lightbox
        open={!!lightboxImage}
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  )
}
