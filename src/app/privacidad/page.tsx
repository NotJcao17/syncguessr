import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Qué datos trata syncguessr, con quién se comparten y cómo ejercer tus derechos.",
};

const OWNER = "Juan Carlos Orozco";
const CONTACT_EMAIL = "contacto@syncoraplayer.app";
const UPDATED = "9 de noviembre de 2026";

export default function PrivacyPage() {
  const mail = `mailto:${CONTACT_EMAIL}`;
  return (
    <main className="mx-auto w-full max-w-2xl px-[var(--gutter)] pb-20">
      <header className="flex h-16 items-center gap-2">
        <Link href="/" className="icon-btn -ml-2" aria-label="Volver al inicio">
          <Icon name="back" className="size-6" />
        </Link>
        <p className="font-bold wide">syncguessr</p>
      </header>

      <article className="doc pt-6">
        <h1 className="text-[clamp(2.1rem,6vw,3.25rem)] leading-[1.02] font-extrabold wide tracking-[-0.035em]">
          Aviso de privacidad
        </h1>
        <p className="!mt-3 text-sm !text-ink-3">Última actualización: {UPDATED}</p>

        <div className="mt-7 rounded-[20px] bg-surface px-5 py-4">
          <p className="!mt-0">
            <strong>En corto:</strong> no hay cuentas, cookies, anuncios ni rastreadores. No te pedimos nombre ni
            correo, y tus estadísticas se quedan en tu navegador.
          </p>
        </div>

        <h2>1. Quién es responsable</h2>
        <p>
          syncguessr es un juego gratuito y sin fines de lucro, parte del proyecto Syncora. El responsable de los datos
          es <strong>{OWNER}</strong>, con residencia en México. Para cualquier asunto de este aviso escribe a{" "}
          <a href={mail}>{CONTACT_EMAIL}</a>. Este aviso se emite conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares.
        </p>

        <h2>2. Qué datos se tratan</h2>
        <ul>
          <li>
            <strong>En tu navegador:</strong> estadísticas, rachas, récords, el reto diario, las canciones que ya
            escuchaste (para no repetirlas), tus filtros, el volumen, las selecciones de artistas que guardas, las
            playlists que cargaste hace poco y el nombre que usas en el modo fiesta. Se guardan en el almacenamiento local de tu navegador y no se envían a
            syncguessr.
          </li>
          <li>
            <strong>Al jugar:</strong> el servidor recibe tus intentos y tus búsquedas para revisarlos y pide el
            audio de cada ronda. No los guarda ni los relaciona contigo. En el modo playlist las búsquedas se hacen en
            Deezer desde nuestro servidor.
          </li>
          <li>
            <strong>Contador de partidas:</strong> al terminar una partida se suma 1 a un contador público de partidas
            jugadas. Solo se envía ese +1, nada sobre ti.
          </li>
          <li>
            <strong>Datos técnicos:</strong> como cualquier sitio, el servidor ve tu dirección IP y tu navegador para
            entregarte la página, y quedan en registros temporales del servicio de alojamiento.
          </li>
        </ul>
        <p>No tratamos datos personales sensibles ni financieros, y no hay finalidades secundarias: nada se usa para publicidad ni se vende.</p>

        <h2>3. Con quién se comparten</h2>
        <ul>
          <li>
            <strong>Vercel:</strong> aloja el sitio y su servidor, que puede estar fuera de México.
          </li>
          <li>
            <strong>Deezer:</strong> el audio de cada ronda y las portadas y fotos de artistas se cargan directo
            desde Deezer, que recibe tu dirección IP. Nuestro servidor solo le pide el enlace de la canción, sin
            mandarle nada sobre ti.
          </li>
          <li>
            <strong>Modo fiesta:</strong> para conectar los dispositivos se usa el servidor público de PeerJS, que
            recibe tu IP y el código de la sala, y servidores de conexión de Google y PeerJS. Después cada invitado se
            conecta directo con el anfitrión: el anfitrión puede ver la IP de los invitados y cada invitado la del
            anfitrión, pero los invitados no ven la de los demás. Todos ven el nombre que elegiste y tus aciertos.
          </li>
          <li>
            <strong>Modo playlist:</strong> el enlace que pegas llega a nuestro servidor, que lee la playlist pública
            en Spotify, Syncora Player o Deezer sin mandarles nada sobre ti. No guardamos la playlist: viaja cifrada
            entre tu navegador y el servidor mientras juegas. Tu navegador guarda el nombre y el enlace de las
            últimas playlists para que las vuelvas a cargar, y su portada se carga directo desde ese servicio.
          </li>
          <li>
            <strong>Abacus:</strong> guarda el contador de partidas. Recibe el +1 desde nuestro servidor, no desde tu
            navegador.
          </li>
        </ul>
        <p>Cada servicio tiene su propio aviso de privacidad. Podemos revelar datos si una autoridad competente lo exige conforme a la ley.</p>

        <h2>4. Cookies</h2>
        <p>
          syncguessr no usa cookies. Para borrar todo lo que se guarda en tu navegador, borra los datos de este sitio
          desde la configuración de tu navegador.
        </p>

        <h2>5. Tus derechos</h2>
        <p>
          Tienes derecho a acceder, rectificar, cancelar y oponerte al tratamiento de tus datos (derechos ARCO). Como
          syncguessr no guarda nada que te identifique, normalmente no hay datos tuyos que consultar, pero puedes
          escribir a <a href={mail}>{CONTACT_EMAIL}</a> y te responderemos en un máximo de 20 días hábiles. Si
          consideras que tu derecho no fue atendido, puedes acudir a la autoridad competente en protección de datos.
        </p>

        <h2>6. Menores de edad</h2>
        <p>El juego es para todo público y no pide datos a nadie, incluidos los menores de edad.</p>

        <h2>7. Cambios</h2>
        <p>Si este aviso cambia, publicaremos la nueva versión en esta misma página con su fecha de actualización.</p>
      </article>
    </main>
  );
}
