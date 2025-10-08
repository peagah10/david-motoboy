const CACHE_NAME = 'david-motoboy-v1.0.2';

// Lista apenas arquivos que SABEMOS que existem
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
        // Cache apenas os arquivos essenciais, um por vez
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(err => {
              console.log('[SW] Falha ao cachear:', url, err);
              // Continua mesmo se um arquivo falhar
              return Promise.resolve();
            });
          })
        );
      })
      .then(() => {
        console.log('[SW] Instalação concluída');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Erro na instalação:', err);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Ativado com sucesso');
      return self.clients.claim();
    })
  );
});

// Interceptar requisições - estratégia simples
self.addEventListener('fetch', event => {
  // Só processa requisições GET do mesmo domínio
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrou no cache, retorna
        if (response) {
          console.log('[SW] Servindo do cache:', event.request.url);
          return response;
        }
        
        // Se não encontrou, busca na rede
        return fetch(event.request)
          .then(response => {
            // Se a resposta for válida, adiciona ao cache
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(err => {
            console.log('[SW] Erro na rede:', err);
            // Se falhar e for uma página, retorna página offline básica
            if (event.request.destination === 'document') {
              return new Response(
                `<!DOCTYPE html>
                <html>
                <head>
                  <title>Offline - David Motoboy</title>
                  <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; }
                    h1 { color: #DAA520; }
                  </style>
                </head>
                <body>
                  <h1>📱 David Motoboy</h1>
                  <p>Você está offline</p>
                  <p>Conecte-se à internet para acessar todos os recursos</p>
                </body>
                </html>`,
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});


