/* ── Flipbook Studio Pro: Inspector & Karaoke Properties Engine ─── */
// ── Render Inspector Cards ────────────────────────────────────────────────

    function renderInteractionsInspector() {

      const page = pagesData[currentPageIndex];

      const listEl = document.getElementById('interactions-list');

      listEl.innerHTML = '';

      const count = page.interactions.length;

      document.getElementById('page-summary-badge').textContent = `${count} interaction${count > 1 ? 's' : ''}`;

      if (count === 0) {

        listEl.innerHTML = `

          <div style="text-align:center; padding:24px 10px; color:var(--text-muted); font-size:12px; border:1px dashed var(--border); border-radius:8px;">

            Aucune interaction sur cette page.<br/>

            Utilisez les boutons d'outils au-dessus de l'image pour placer un texte à lire, un son ou une modale.

          </div>

        `;

        return;

      }

      page.interactions.forEach(inter => {

        const isSelected = selectedInteractionId === inter.id;

        const card = document.createElement('div');

        card.id = 'inter-card-' + inter.id;

        card.className = 'item-card' + (isSelected ? ' selected' : '');

        if (inter.type === 'tts') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge tts">🗣️ Texte à lire (TTS)</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:0">

              <label>Titre / Label :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.title || '')}" oninput="updateInterProp('${inter.id}', 'title', this.value)" />

            </div>

            <div class="form-group">

              <div style="display:flex; justify-content:space-between; align-items:center;">

                <label>Texte à prononcer :</label>

                <button class="btn" style="padding:2px 8px; font-size:10px;" type="button" onclick="pasteSelectionToInter('${inter.id}')" title="Coller le texte surligné sur la page de gauche">📋 Coller sélection</button>

              </div>

              <textarea class="input-textarea" oninput="updateInterProp('${inter.id}', 'text', this.value)">${escapeHtml(inter.text || '')}</textarea>

            </div>

            <div style="display:flex; gap:8px; align-items:center;">

              <select class="input-select" onchange="updateInterProp('${inter.id}', 'lang', this.value)">

                <option value="fr-FR" ${inter.lang === 'fr-FR' ? 'selected' : ''}>Français (fr-FR)</option>

                <option value="en-US" ${inter.lang === 'en-US' ? 'selected' : ''}>English US (en-US)</option>

                <option value="en-GB" ${inter.lang === 'en-GB' ? 'selected' : ''}>English UK (en-GB)</option>

                <option value="es-ES" ${inter.lang === 'es-ES' ? 'selected' : ''}>Español (es-ES)</option>

                <option value="de-DE" ${inter.lang === 'de-DE' ? 'selected' : ''}>Deutsch (de-DE)</option>

                <option value="ar-SA" ${inter.lang === 'ar-SA' ? 'selected' : ''}>العربية (ar-SA)</option>

              </select>

              <button class="btn btn-primary" type="button" onclick="testTtsSpeech('${inter.id}')">▶ Tester Voix</button>

            </div>

            <div style="margin-top:10px; padding:10px 12px; background:rgba(0,162,237,0.08); border:1px solid rgba(0,162,237,0.28); border-radius:8px;">

              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:700; color:#38bdf8; text-transform:none; margin:0; user-select:none;">

                <input type="checkbox" id="chk-karaoke-${inter.id}" style="width:16px; height:16px; cursor:pointer; accent-color:#00a2ed;" ${inter.karaoke !== false ? 'checked' : ''} onchange="updateInterProp('${inter.id}', 'karaoke', this.checked)">

                <span>🎨 Activer l'effet Karaoké mot à mot sur la page</span>

              </label>

              <div style="font-size:11px; color:var(--text-muted); margin-top:4px; margin-left:24px; line-height:1.4;">

                ${inter.karaoke !== false ? '✓ Le texte de la page est encadré et surligné pendant la lecture.' : '○ Seule la voix est lue sans encadrer ni surligner la page.'}

              </div>

            </div>

            <div id="tts-karaoke-box-${inter.id}" class="karaoke-preview-box" style="display:none; margin-top:8px;"></div>

            <div class="item-coord-row">

              <div class="form-group">

                <label>X :</label>

                <input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" />

              </div>

              <div class="form-group">

                <label>Y :</label>

                <input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" />

              </div>

              <div class="form-group">

                <label title="Taille du bouton tactile">Taille (px) :</label>

                <input type="number" class="input-text" value="${inter.size || 34}" min="24" max="80" onchange="updateInterProp('${inter.id}', 'size', parseInt(this.value))" />

              </div>

            </div>

          `;

        } else if (inter.type === 'audio') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge audio">🎧 Fichier Audio</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:0">

              <label>Titre de la piste :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.title || '')}" oninput="updateInterProp('${inter.id}', 'title', this.value)" />

            </div>

            <div class="form-group">

              <label>Fichier Audio Source :</label>

              <div class="input-with-btn">

                <input type="text" class="input-text" value="${escapeHtml(inter.src || '')}" oninput="updateInterProp('${inter.id}', 'src', this.value)" placeholder="C:/audio/track.mp3" />

                <button class="btn" type="button" onclick="browseAudioForInter('${inter.id}')">📁</button>

                <button class="btn btn-primary" type="button" onclick="testAudioPlay('${inter.id}')">▶ Écouter</button>

              </div>

            </div>

            <div class="item-coord-row">

              <div class="form-group">

                <label>X :</label>

                <input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" />

              </div>

              <div class="form-group">

                <label>Y :</label>

                <input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" />

              </div>

              <div class="form-group">

                <label title="Taille du bouton tactile">Taille (px) :</label>

                <input type="number" class="input-text" value="${inter.size || 34}" min="24" max="80" onchange="updateInterProp('${inter.id}', 'size', parseInt(this.value))" />

              </div>

            </div>

          `;

        } else if (inter.type === 'video') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge" style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);">▶️ Vidéo YouTube</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:0">

              <label>Titre de la vidéo :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.title || '')}" oninput="updateInterProp('${inter.id}', 'title', this.value)" placeholder="Ex: Vocabulaire en action" />

            </div>

            <div class="form-group">

              <label>Lien YouTube :</label>

              <div class="input-with-btn">

                <input type="text" class="input-text" value="${escapeHtml(inter.youtubeUrl || '')}" oninput="updateInterProp('${inter.id}', 'youtubeUrl', this.value)" placeholder="https://www.youtube.com/watch?v=..." />

                <button class="btn btn-primary" style="background:#ef4444; border-color:#dc2626;" type="button" onclick="previewStudioVideo('${inter.id}')">▶ Tester</button>

              </div>

            </div>

            <div class="item-coord-row">

              <div class="form-group">

                <label>X :</label>

                <input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" />

              </div>

              <div class="form-group">

                <label>Y :</label>

                <input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" />

              </div>

              <div class="form-group">

                <label title="Taille du bouton tactile">Taille (px) :</label>

                <input type="number" class="input-text" value="${inter.size || 34}" min="24" max="80" onchange="updateInterProp('${inter.id}', 'size', parseInt(this.value))" />

              </div>

            </div>

          `;

        } else if (inter.type === 'modal' || inter.type === 'zoom') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge modal">🔍 Zone Modale Zoom HD</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:0">

              <label>Titre / Légende :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.title || '')}" oninput="updateInterProp('${inter.id}', 'title', this.value)" />

            </div>

            <div class="form-group">

              <label>Image du Modal (laisser vide pour la page entière) :</label>

              <div class="input-with-btn">

                <input type="text" class="input-text" value="${escapeHtml(inter.imageSrc || inter.hiresSrc || '')}" oninput="updateInterProp('${inter.id}', 'hiresSrc', this.value)" placeholder="Page entière par défaut" />

                <button class="btn" type="button" onclick="browseImageForInter('${inter.id}')">📁</button>

                <button class="btn btn-amber" type="button" onclick="testModalPreview('${inter.id}')">👁️ Tester</button>

              </div>

            </div>

            <div class="item-coord-row">

              <div class="form-group">

                <label>X :</label>

                <input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" />

              </div>

              <div class="form-group">

                <label>Y :</label>

                <input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" />

              </div>

              <div class="form-group">

                <label>Largeur :</label>

                <input type="text" class="input-text" id="input-w-${inter.id}" value="${inter.width || '40%'}" onchange="updateInterProp('${inter.id}', 'width', this.value)" />

              </div>

              <div class="form-group">

                <label>Hauteur :</label>

                <input type="text" class="input-text" id="input-h-${inter.id}" value="${inter.height || '30%'}" onchange="updateInterProp('${inter.id}', 'height', this.value)" />

              </div>

            </div>

          `;

        } else if (inter.type === 'fill-blank') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge fill-blank">✏️ Texte à trou</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:8px">

              <label>Titre de l'exercice :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.title || '')}" oninput="updateInterProp('${inter.id}', 'title', this.value)" />

            </div>

            <div class="form-group">

              <label>✅ Bonne réponse attendue :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.answer || '')}" oninput="updateInterProp('${inter.id}', 'answer', this.value)" placeholder="Ex: bicycle" />

            </div>

            <div class="form-group">

              <label>Réponses alternatives acceptées (séparées par ;) :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.acceptAlternatives || '')}" oninput="updateInterProp('${inter.id}', 'acceptAlternatives', this.value)" placeholder="Ex: bike;vélo" />

            </div>

            <div class="form-group">

              <label>💡 Indice (affiché si l'élève clique '?') :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.hint || '')}" oninput="updateInterProp('${inter.id}', 'hint', this.value)" placeholder="Ex: Un moyen de transport à 2 roues" />

            </div>

            <div style="margin-top:10px; padding:8px 12px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); border-radius:8px;">

              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:700; color:#34d399; margin:0; user-select:none;">

                <input type="checkbox" style="width:15px;height:15px;accent-color:#10b981;" ${inter.caseSensitive ? 'checked' : ''} onchange="updateInterProp('${inter.id}', 'caseSensitive', this.checked)">

                <span>Respecter la casse (Majuscules / minuscules)</span>

              </label>

            </div>

            <div class="form-group">

              <label>Groupe de validation (ex: groupe-p3) :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.groupId || '')}" oninput="updateInterProp('${inter.id}', 'groupId', this.value)" />

            </div>

            <div class="item-coord-row">

              <div class="form-group"><label>X :</label><input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" /></div>

              <div class="form-group"><label>Y :</label><input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" /></div>

              <div class="form-group"><label>Largeur :</label><input type="text" class="input-text" id="input-w-${inter.id}" value="${inter.width || '15%'}" onchange="updateInterProp('${inter.id}', 'width', this.value)" /></div>

              <div class="form-group"><label>Hauteur :</label><input type="text" class="input-text" id="input-h-${inter.id}" value="${inter.height || '5%'}" onchange="updateInterProp('${inter.id}', 'height', this.value)" /></div>

            </div>

          `;

        } else if (inter.type === 'reveal') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge reveal">👁️ Zone à révéler</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:8px">

              <label>Titre :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.title || '')}" oninput="updateInterProp('${inter.id}', 'title', this.value)" />

            </div>

            <div class="form-group">

              <label>Texte du bouton masqué :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.coverLabel || '💡 Cliquer pour révéler')}" oninput="updateInterProp('${inter.id}', 'coverLabel', this.value)" />

            </div>

            <div class="form-group">

              <label>Couleur du masque :</label>

              <input type="color" value="${inter.coverColor || '#f59e0b'}" style="width:48px;height:36px;border:none;border-radius:6px;cursor:pointer;" onchange="updateInterProp('${inter.id}', 'coverColor', this.value); renderOverlayHotspots();" />

            </div>

            <div class="form-group">

              <label>Texte révélé (laisser vide = révèle le texte du PDF dessous) :</label>

              <textarea class="input-textarea" oninput="updateInterProp('${inter.id}', 'revealText', this.value)">${escapeHtml(inter.revealText || '')}</textarea>

            </div>

            <div class="form-group">

              <label>Son à jouer à la révélation (fichier audio) :</label>

              <div class="input-with-btn">

                <input type="text" class="input-text" value="${escapeHtml(inter.revealAudio || '')}" oninput="updateInterProp('${inter.id}', 'revealAudio', this.value)" placeholder="Optionnel" />

                <button class="btn" type="button" onclick="browseAudioForInter('${inter.id}')">📁</button>

              </div>

            </div>

            <div class="item-coord-row">

              <div class="form-group"><label>X :</label><input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" /></div>

              <div class="form-group"><label>Y :</label><input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" /></div>

              <div class="form-group"><label>Largeur :</label><input type="text" class="input-text" id="input-w-${inter.id}" value="${inter.width || '25%'}" onchange="updateInterProp('${inter.id}', 'width', this.value)" /></div>

              <div class="form-group"><label>Hauteur :</label><input type="text" class="input-text" id="input-h-${inter.id}" value="${inter.height || '5%'}" onchange="updateInterProp('${inter.id}', 'height', this.value)" /></div>

            </div>

          `;

        } else if (inter.type === 'checkbox-task') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge checkbox-task">☑️ Case à cocher</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:8px">

              <label>Affirmation affichée à l'élève :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.label || '')}" oninput="updateInterProp('${inter.id}', 'label', this.value)" placeholder="Ex: This sentence is true." />

            </div>

            <div style="margin-top:10px; padding:8px 12px; background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:8px;">

              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:700; margin:0; user-select:none; color:var(--text);">

                <input type="checkbox" style="width:15px;height:15px;" ${inter.hideLabel ? 'checked' : ''} onchange="updateInterProp('${inter.id}', 'hideLabel', this.checked);">

                <span>Masquer le texte (Affiche uniquement la case carrée)</span>

              </label>

            </div>

            <div style="margin-top:10px; padding:8px 12px; background:rgba(244,63,94,0.08); border:1px solid rgba(244,63,94,0.3); border-radius:8px;">

              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; font-weight:700; color:#fb7185; margin:0; user-select:none;">

                <input type="checkbox" style="width:15px;height:15px;accent-color:#f43f5e;" ${inter.isCorrect ? 'checked' : ''} onchange="updateInterProp('${inter.id}', 'isCorrect', this.checked); renderOverlayHotspots();">

                <span>✅ Cette affirmation est VRAIE (cochée = bonne réponse)</span>

              </label>

            </div>

            <div class="form-group">

              <label>Groupe de validation (même valeur = validés ensemble) :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.groupId || '')}" oninput="updateInterProp('${inter.id}', 'groupId', this.value)" />

            </div>

            <div class="item-coord-row">

              <div class="form-group"><label>X :</label><input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" /></div>

              <div class="form-group"><label>Y :</label><input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" /></div>

              <div class="form-group">

                <label title="Taille du bouton tactile">Taille (px) :</label>

                <input type="number" class="input-text" value="${inter.size || 32}" min="20" max="80" onchange="updateInterProp('${inter.id}', 'size', parseInt(this.value)); renderOverlayHotspots();" />

              </div>

            </div>

          `;

        } else if (inter.type === 'validation-btn') {

          card.innerHTML = `

            <div class="item-card-header">

              <span class="item-badge" style="background:#10b981;color:#fff;">🎯 Bouton Valider</span>

              <button class="btn btn-danger" style="padding:3px 8px; font-size:11px;" onclick="deleteInteraction('${inter.id}')">🗑️</button>

            </div>

            <div class="form-group" style="margin-top:8px">

              <label>Texte du bouton :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.label || '✓ Corriger')}" oninput="updateInterProp('${inter.id}', 'label', this.value); renderOverlayHotspots();" />

            </div>

            <div class="form-group">

              <label>Action du bouton :</label>

              <select class="input-select" onchange="updateInterProp('${inter.id}', 'actionType', this.value)">

                <option value="validate" ${inter.actionType === 'validate' ? 'selected' : ''}>Corriger (Affiche le score)</option>

                <option value="reveal" ${inter.actionType === 'reveal' ? 'selected' : ''}>Révéler les réponses</option>

                <option value="reset" ${inter.actionType === 'reset' ? 'selected' : ''}>Recommencer (Effacer)</option>

              </select>

            </div>

            <div class="form-group">

              <label>Groupe (laisser vide = toute la page) :</label>

              <input type="text" class="input-text" value="${escapeHtml(inter.groupId || '')}" oninput="updateInterProp('${inter.id}', 'groupId', this.value)" />

            </div>

            <div class="item-coord-row">

              <div class="form-group"><label>X :</label><input type="text" class="input-text" id="input-x-${inter.id}" value="${inter.x}" onchange="updateInterProp('${inter.id}', 'x', this.value)" /></div>

              <div class="form-group"><label>Y :</label><input type="text" class="input-text" id="input-y-${inter.id}" value="${inter.y}" onchange="updateInterProp('${inter.id}', 'y', this.value)" /></div>

              <div class="form-group"><label>Largeur :</label><input type="text" class="input-text" id="input-w-${inter.id}" value="${inter.width || '15%'}" onchange="updateInterProp('${inter.id}', 'width', this.value); renderOverlayHotspots();" /></div>

              <div class="form-group"><label>Hauteur :</label><input type="text" class="input-text" id="input-h-${inter.id}" value="${inter.height || '6%'}" onchange="updateInterProp('${inter.id}', 'height', this.value); renderOverlayHotspots();" /></div>

            </div>

          `;

        }

        listEl.appendChild(card);

      });

    }

    function updateInterProp(id, prop, val) {

      const page = pagesData[currentPageIndex];

      const inter = page.interactions.find(i => i.id === id);

      if (inter) {

        inter[prop] = val;

        if (prop === 'hiresSrc') inter.imageSrc = val;

        renderOverlayHotspots();

        renderFilmstrip();

        autoSaveProject();

      }

    }

    async function browseAudioForInter(id) {

      try {

        const res = await fetch('/api/browse-audio', { method: 'POST' });

        const data = await res.json();

        if (data.path) {

          updateInterProp(id, 'src', data.path);

          renderInteractionsInspector();

        }

      } catch (err) {

        console.error(err);

      }

    }

    async function browseImageForInter(id) {

      try {

        const res = await fetch('/api/browse-image', { method: 'POST' });

        const data = await res.json();

        if (data.path) {

          updateInterProp(id, 'hiresSrc', data.path);

          renderInteractionsInspector();

        }

      } catch (err) {

        console.error(err);

      }

    }

    // ══════════════════════════════════════════════════════════

    // KARAOKE ENGINE: DIRECT ON-PAGE SYNCHRONIZED HIGHLIGHT

    // ══════════════════════════════════════════════════════════

    let currentKaraokeState = null;

    let activePageKaraokeState = null;

    let pageTextLinesCache = {};

    function detectTextLanguage(text) {

      if (!text) return 'en-US';

      const cleanLower = ' ' + text.toLowerCase().replace(/[^a-z\s]/g, ' ') + ' ';

      const enWords = [' the ', ' and ', ' to ', ' in ', ' is ', ' he ', ' she ', ' they ', ' was ', ' for ', ' with ', ' his ', ' her ', ' this ', ' that ', ' bike ', ' like '];

      const frWords = [' le ', ' la ', ' les ', ' un ', ' une ', ' des ', ' est ', ' dans ', ' pour ', ' avec ', ' son ', ' sa ', ' ses ', ' ce ', ' cette '];

      let enScore = 0;

      let frScore = 0;

      enWords.forEach(w => { if (cleanLower.includes(w)) enScore++; });

      frWords.forEach(w => { if (cleanLower.includes(w)) frScore++; });

      if (frScore > enScore) return 'fr-FR';

      return 'en-US';

    }

    async function getPageWordsData(pageNum) {

      if (!currentPdfPath) return [];

      const cacheKey = `${currentPdfPath}_p${pageNum}`;

      let data = pageTextLinesCache[cacheKey];

      if (!data || !data.words) {

        try {

          const res = await fetch(`/api/page-text?pdf=${encodeURIComponent(currentPdfPath)}&page=${pageNum}`);

          data = await res.json();

          if (data && data.success) {

            pageTextLinesCache[cacheKey] = data;

          }

        } catch (e) {

          console.warn("getPageWordsData error:", e);

        }

      }

      return (data && data.words) ? data.words : [];

    }

    function buildKaraokeTokens(text) {

      if (!text) return { html: '', tokens: [] };

      const regex = /(\S+)/g;

      let lastIndex = 0;

      let match;

      let html = '';

      let index = 0;

      const tokens = [];

      while ((match = regex.exec(text)) !== null) {

        const start = match.index;

        const word = match[0];

        const end = start + word.length;

        const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

        if (start > lastIndex) {

          html += escapeHtml(text.substring(lastIndex, start));

        }

        html += `<span class="k-word" data-word-idx="${index}" data-start="${start}" data-end="${end}">${escapeHtml(word)}</span>`;

        tokens.push({ index, start, end, word, clean });

        index++;

        lastIndex = end;

      }

      if (lastIndex < text.length) {

        html += escapeHtml(text.substring(lastIndex));

      }

      return { html, tokens };

    }

    function matchTokensToPageWords(tokens, pageWords, nearX, nearY) {

      if (!tokens.length || !pageWords || !pageWords.length) {

        return tokens.map(t => ({ ...t }));

      }

      const cleanPageWords = pageWords.map(pw => ({

        ...pw,

        clean: (pw.word || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

      }));

      let bestStart = -1;

      let bestScore = -1;

      const firstClean = tokens[0].clean;

      for (let i = 0; i < cleanPageWords.length; i++) {

        if (cleanPageWords[i].clean === firstClean) {

          let matches = 0;

          for (let k = 0; k < tokens.length && (i + k) < cleanPageWords.length; k++) {

            if (cleanPageWords[i + k].clean === tokens[k].clean) {

              matches++;

            } else {

              break;

            }

          }

          let score = matches * 10;

          if (nearX !== undefined && nearY !== undefined) {

            const dx = cleanPageWords[i].x - nearX;

            const dy = cleanPageWords[i].y - nearY;

            score += 25.0 / (1.0 + Math.sqrt(dx * dx + dy * dy));

          }

          if (score > bestScore) {

            bestScore = score;

            bestStart = i;

          }

        }

      }

      if (bestStart === -1) {

        for (let tIdx = 0; tIdx < Math.min(3, tokens.length); tIdx++) {

          const tc = tokens[tIdx].clean;

          if (!tc) continue;

          for (let i = 0; i < cleanPageWords.length; i++) {

            if (cleanPageWords[i].clean === tc) {

              bestStart = Math.max(0, i - tIdx);

              break;

            }

          }

          if (bestStart >= 0) break;

        }

      }

      const mapped = [];

      if (bestStart >= 0) {

        let pCursor = bestStart;

        for (let k = 0; k < tokens.length; k++) {

          const tok = tokens[k];

          let matchedPw = null;

          // Lookahead up to 3 words in cleanPageWords to handle slight differences

          for (let look = 0; look < 3 && (pCursor + look) < cleanPageWords.length; look++) {

            const cand = cleanPageWords[pCursor + look];

            if (cand.clean === tok.clean) {

              matchedPw = cand;

              pCursor = pCursor + look + 1;

              break;

            }

          }

          if (!matchedPw && pCursor < cleanPageWords.length) {

            matchedPw = cleanPageWords[pCursor];

            pCursor++;

          }

          if (matchedPw && matchedPw.w > 0 && matchedPw.h > 0) {

            mapped.push({

              ...tok,

              x: matchedPw.x,

              y: matchedPw.y,

              w: matchedPw.w,

              h: matchedPw.h

            });

          } else {

            mapped.push({ ...tok });

          }

        }

      } else {

        tokens.forEach(t => mapped.push({ ...t }));

      }

      return mapped;

    }

    function clearDirectKaraoke(containerEl) {

      if (activePageKaraokeState) {

        if (activePageKaraokeState.fallbackTimer) {

          clearTimeout(activePageKaraokeState.fallbackTimer);

        }

        activePageKaraokeState = null;

      }

      const layer = containerEl || document.getElementById('sim-karaoke-page-layer');

      if (layer) layer.innerHTML = '';

      const canvasLayer = document.getElementById('canvas-karaoke-page-layer');

      if (canvasLayer) canvasLayer.innerHTML = '';

    }

    function startDirectPageKaraoke(utterance, tokens, pageWords, nearX, nearY, targetLayer) {

      clearDirectKaraoke(targetLayer);

      if (!targetLayer) return;

      const mappedWords = matchTokensToPageWords(tokens, pageWords, nearX, nearY);

      // Single active glowing reading frame moving on the page

      const frameEl = document.createElement('div');

      frameEl.className = 'karaoke-onpage-box';

      frameEl.style.display = 'none';

      targetLayer.appendChild(frameEl);

      const state = {

        mappedWords,

        targetLayer,

        frameEl,

        currentIndex: -1,

        lastUnderlineIdx: -1,

        boundaryFired: false,

        fallbackTimer: null

      };

      activePageKaraokeState = state;

      function highlightWordIndex(idx) {

        if (idx < 0 || idx >= mappedWords.length) return;

        state.currentIndex = idx;

        const w = mappedWords[idx];

        if (w.x !== undefined && w.y !== undefined && w.w !== undefined) {

          frameEl.style.left = `${w.x}%`;

          frameEl.style.top = `${w.y}%`;

          frameEl.style.width = `${w.w}%`;

          frameEl.style.height = `${w.h}%`;

          frameEl.style.display = 'block';

          // Leave clean underlines for all read words up to idx - 1

          if (idx > state.lastUnderlineIdx) {

            for (let r = Math.max(0, state.lastUnderlineIdx); r < idx; r++) {

              const prev = mappedWords[r];

              if (prev && prev.x !== undefined && !prev.underlined) {

                prev.underlined = true;

                const readLine = document.createElement('div');

                readLine.className = 'karaoke-onpage-read';

                readLine.style.left = `${prev.x}%`;

                readLine.style.top = `${prev.y + prev.h}%`;

                readLine.style.width = `${prev.w}%`;

                readLine.style.height = `3px`;

                targetLayer.appendChild(readLine);

              }

            }

            state.lastUnderlineIdx = idx;

          }

        }

      }

      // Highlight the first word immediately upon click

      if (mappedWords.length > 0) {

        highlightWordIndex(0);

      }

      // Dynamic adaptive cadence: word duration adapts to letter length and speech rate

      function scheduleAdaptiveFallback(fromIdx) {

        if (state.fallbackTimer) clearTimeout(state.fallbackTimer);

        if (activePageKaraokeState !== state) return;

        if (fromIdx >= mappedWords.length - 1) return;

        const currentW = mappedWords[fromIdx] ? (mappedWords[fromIdx].word || '') : '';

        const expectedDuration = Math.max(260, Math.round((240 + Math.min(10, currentW.length) * 42) / (utterance.rate || 0.80)));

        state.fallbackTimer = setTimeout(() => {

          if (activePageKaraokeState !== state) return;

          const nextIdx = fromIdx + 1;

          highlightWordIndex(nextIdx);

          scheduleAdaptiveFallback(nextIdx);

        }, expectedDuration);

      }

      scheduleAdaptiveFallback(0);

      utterance.onboundary = (e) => {

        if (e.name === 'word' || e.name === 'sentence') {

          state.boundaryFired = true;

          const charIdx = e.charIndex;

          let bestIdx = -1;

          for (let i = 0; i < tokens.length; i++) {

            if (charIdx >= tokens[i].start && charIdx <= tokens[i].end) {

              bestIdx = i;

              break;

            }

            if (tokens[i].start > charIdx) {

              bestIdx = i;

              break;

            }

          }

          if (bestIdx === -1 && tokens.length > 0) {

            bestIdx = tokens.length - 1;

          }

          if (bestIdx >= 0) {

            highlightWordIndex(bestIdx);

            scheduleAdaptiveFallback(bestIdx);

          }

        }

      };

      const origEnd = utterance.onend;

      utterance.onend = (e) => {

        if (state.fallbackTimer) clearTimeout(state.fallbackTimer);

        if (mappedWords.length > 0) {

          const lastW = mappedWords[mappedWords.length - 1];

          if (lastW && lastW.x !== undefined && !lastW.underlined) {

            lastW.underlined = true;

            const readLine = document.createElement('div');

            readLine.className = 'karaoke-onpage-read';

            readLine.style.left = `${lastW.x}%`;

            readLine.style.top = `${lastW.y + lastW.h}%`;

            readLine.style.width = `${lastW.w}%`;

            readLine.style.height = `3px`;

            targetLayer.appendChild(readLine);

          }

        }

        frameEl.style.opacity = '0';

        setTimeout(() => {

          if (activePageKaraokeState === state) {

            clearDirectKaraoke(targetLayer);

          }

        }, 800);

        if (origEnd) origEnd(e);

      };

      const origErr = utterance.onerror;

      utterance.onerror = (e) => {

        if (state.fallbackTimer) clearTimeout(state.fallbackTimer);

        clearDirectKaraoke(targetLayer);

        if (origErr) origErr(e);

      };

    }

    function createKaraokeSession(text, containerEl, onFinish) {

      if (currentKaraokeState) {

        if (currentKaraokeState.fallbackTimer) clearInterval(currentKaraokeState.fallbackTimer);

        currentKaraokeState = null;

      }

      if (!containerEl) return null;

      const { html, tokens } = buildKaraokeTokens(text);

      containerEl.innerHTML = html;

      const state = {

        tokens,

        containerEl,

        currentIndex: -1,

        boundaryFired: false,

        fallbackTimer: null,

        onFinish

      };

      currentKaraokeState = state;

      return state;

    }

    function highlightKaraokeIndex(state, targetIdx) {

      if (!state || targetIdx === state.currentIndex) return;

      state.currentIndex = targetIdx;

      const spans = state.containerEl.querySelectorAll('.k-word');

      spans.forEach((sp, i) => {

        if (i < targetIdx) {

          sp.className = 'k-word k-read';

        } else if (i === targetIdx) {

          sp.className = 'k-word k-active';

          try {

            sp.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

          } catch(e) {}

        } else {

          sp.className = 'k-word';

        }

      });

    }

    function highlightKaraokeByChar(state, charIndex) {

      if (!state || !state.tokens.length) return;

      state.boundaryFired = true;

      let bestIdx = -1;

      for (let i = 0; i < state.tokens.length; i++) {

        const t = state.tokens[i];

        if (charIndex >= t.start && charIndex < t.end) {

          bestIdx = i;

          break;

        } else if (t.start >= charIndex) {

          bestIdx = i;

          break;

        }

      }

      if (bestIdx === -1 && charIndex >= state.tokens[state.tokens.length - 1].end) {

        bestIdx = state.tokens.length - 1;

      }

      if (bestIdx >= 0) {

        highlightKaraokeIndex(state, bestIdx);

      }

    }

    function startKaraokePlayback(utterance, state, estWordsPerMin = 100) {

      if (!state || !state.tokens.length) return;

      utterance.onboundary = (e) => {

        if (e.name === 'word' || e.name === 'sentence') {

          highlightKaraokeByChar(state, e.charIndex);

        }

      };

      const intervalMs = Math.round(60000 / estWordsPerMin);

      let stepIdx = 0;

      setTimeout(() => {

        if (currentKaraokeState !== state) return;

        if (!state.boundaryFired) {

          state.fallbackTimer = setInterval(() => {

            if (currentKaraokeState !== state) {

              clearInterval(state.fallbackTimer);

              return;

            }

            if (state.boundaryFired) {

              clearInterval(state.fallbackTimer);

              return;

            }

            if (stepIdx < state.tokens.length) {

              highlightKaraokeIndex(state, stepIdx);

              stepIdx++;

            } else {

              clearInterval(state.fallbackTimer);

            }

          }, intervalMs);

        }

      }, 350);

      const cleanup = () => {

        if (state.fallbackTimer) clearInterval(state.fallbackTimer);

        if (state.containerEl) {

          const spans = state.containerEl.querySelectorAll('.k-word');

          spans.forEach(sp => { sp.className = 'k-word k-read'; });

        }

        if (currentKaraokeState === state) {

          currentKaraokeState = null;

        }

        if (state.onFinish) state.onFinish();

      };

      const origOnEnd = utterance.onend;

      utterance.onend = (e) => {

        cleanup();

        if (origOnEnd) origOnEnd(e);

      };

      const origOnError = utterance.onerror;

      utterance.onerror = (e) => {

        cleanup();

        if (origOnError) origOnError(e);

      };

    }

    // ── Previews: TTS, Audio, and Modal ───────────────────────────────────────

    async function testTtsSpeech(id) {

      const page = pagesData[currentPageIndex];

      const inter = page.interactions.find(i => i.id === id);

      if (!inter || !inter.text) return;

      if (!('speechSynthesis' in window)) {

        alert("La synthèse vocale n'est pas supportée dans votre navigateur.");

        return;

      }

      window.speechSynthesis.cancel();

      clearDirectKaraoke();

      const isKaraokeActive = inter.karaoke !== false;

      let kBox = document.getElementById(`tts-karaoke-box-${inter.id}`);

      if (kBox) {

        kBox.style.display = isKaraokeActive ? 'block' : 'none';

      }

      const utt = new SpeechSynthesisUtterance(inter.text);

      utt.lang = inter.lang || detectTextLanguage(inter.text) || 'en-US';

      utt.rate = 0.80;

      if (isKaraokeActive) {

        const { tokens } = buildKaraokeTokens(inter.text);

        const state = createKaraokeSession(inter.text, kBox);

        startKaraokePlayback(utt, state, Math.round(110 * 0.80));

        const pageWords = await getPageWordsData(page.pageNumber);

        const canvasLayer = document.getElementById('canvas-karaoke-page-layer');

        const nx = parseFloat(String(inter.x).replace('%', ''));

        const ny = parseFloat(String(inter.y).replace('%', ''));

        if (canvasLayer) {

          startDirectPageKaraoke(utt, tokens, pageWords, nx, ny, canvasLayer);

        }

      }

      window.speechSynthesis.speak(utt);

    }

    let testAudioObj = null;

    function testAudioPlay(id) {

      const page = pagesData[currentPageIndex];

      const inter = page.interactions.find(i => i.id === id);

      if (!inter || !inter.src) {

        alert("Veuillez d'abord choisir un fichier audio.");

        return;

      }

      if (testAudioObj) {

        testAudioObj.pause();

        testAudioObj = null;

      }

      testAudioObj = new Audio('/api/media-preview?path=' + encodeURIComponent(inter.src));

      testAudioObj.play().catch(e => alert("Impossible de lire l'audio: " + e.message));

    }

    function getModalImageUrl(page, inter) {

      const actualPdfPath = page.pdfSource || currentPdfPath;

      const actualPdfPageNum = page.pageNumber || (currentPageIndex + 1);

      if (!inter) {

        return `/api/page-preview?pdf=${encodeURIComponent(actualPdfPath)}&page=${actualPdfPageNum}&scale=2.0`;

      }

      if (inter.hiresSrc || inter.imageSrc) {

        return '/api/media-preview?path=' + encodeURIComponent(inter.hiresSrc || inter.imageSrc);

      }

      // If coordinates x, y, width, height exist, request the exact high-definition crop!

      if (inter.x && inter.y && inter.width && inter.height) {

        const x = parseFloat(String(inter.x).replace('%', '').trim());

        const y = parseFloat(String(inter.y).replace('%', '').trim());

        const w = parseFloat(String(inter.width).replace('%', '').trim());

        const h = parseFloat(String(inter.height).replace('%', '').trim());

        if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h) && w > 0.5 && h > 0.5) {

          return `/api/crop-page?pdf=${encodeURIComponent(actualPdfPath)}&page=${actualPdfPageNum}&x=${x}&y=${y}&w=${w}&h=${h}&scale=3.5`;

        }

      }

      return `/api/page-preview?pdf=${encodeURIComponent(actualPdfPath)}&page=${actualPdfPageNum}&scale=2.0`;

    }

    function testModalPreview(id) {

      const page = pagesData[currentPageIndex];

      const inter = page.interactions.find(i => i.id === id);

      const imgSrc = getModalImageUrl(page, inter);

      openStudioModal(imgSrc, inter ? (inter.title || 'Zoom HD') : 'Zoom HD');

    }

