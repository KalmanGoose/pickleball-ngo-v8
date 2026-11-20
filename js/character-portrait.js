/* Small, independent antialiased 3D front-facing portraits for all 3 characters (human, goose, swan). */
(function (window) {
    'use strict';
    const files = new Map();
    const MODEL_URLS = {
        goose: 'models/characters/pickler_goose_mobile.glb',
        swan: 'models/characters/black_swan_mobile.glb'
    };

    function modelBytes(charType) {
        const url = MODEL_URLS[charType] || MODEL_URLS.goose;
        if (!files.has(url)) {
            files.set(url, fetch(url).then(r => {
                if (!r.ok) throw new Error('模型讀取失敗');
                return r.arrayBuffer();
            }).catch(e => { files.delete(url); throw e; }));
        }
        return files.get(url);
    }

    function disposePortraitModel(root) {
        if (!root) return;
        const geometries = new Set(), materials = new Set(), textures = new Set();
        root.traverse(o => {
            if (o.geometry) geometries.add(o.geometry);
            for (const m of o.material ? [].concat(o.material) : []) {
                materials.add(m);
                for (const value of Object.values(m)) if (value && value.isTexture) textures.add(value);
            }
            if (o.skeleton && o.skeleton.boneTexture) textures.add(o.skeleton.boneTexture);
        });
        geometries.forEach(g => g.dispose());
        materials.forEach(m => m.dispose());
        textures.forEach(t => t.dispose());
    }

    // Front-facing cheerful animations for goose & swan (face camera, lively bounce, wave & sway).
    function frontDanceClip(root, charType) {
        const THREE = window.THREE, tracks = [];
        const times = [0, .3, .6, .9, 1.2, 1.5, 1.8, 2.1, 2.4];
        const sway = [0, 1, 0, -1, 0, 1, 0, -1, 0];
        const isSwan = charType === 'swan';
        const rotations = isSwan ? {
            Spine: [0.06, .16, .1], Head: [-0.08, -.1, -.08],
            'UpperArm.L': [.38, .12, .22], 'UpperArm.R': [-.36, -.12, -.22],
            'Forearm.L': [.24, 0, .18], 'Forearm.R': [-.22, 0, -.18],
            'Thigh.L': [.22, 0, .08], 'Thigh.R': [-.22, 0, -.08],
            'Shin.L': [-.2, 0, 0], 'Shin.R': [.2, 0, 0]
        } : {
            Spine: [0.04, .18, .12], Head: [-0.05, -.12, -.07],
            'UpperArm.L': [.34, .09, .16], 'UpperArm.R': [-.34, -.09, -.16],
            'Forearm.L': [.2, 0, .14], 'Forearm.R': [-.2, 0, -.14],
            'Thigh.L': [.32, 0, .1], 'Thigh.R': [-.32, 0, -.1],
            'Shin.L': [-.28, 0, 0], 'Shin.R': [.28, 0, 0]
        };
        root.traverse(bone => {
            if (!bone.isBone) return;
            const name = bone.userData.name || bone.name, amplitude = rotations[name];
            if (!amplitude) return;
            const rest = bone.quaternion.clone(), values = [];
            for (const phase of sway) {
                const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                    amplitude[0] * phase, amplitude[1] * phase, amplitude[2] * phase));
                rest.clone().multiply(delta).toArray(values, values.length);
            }
            tracks.push(new THREE.QuaternionKeyframeTrack(bone.name + '.quaternion', times, values));
        });
        return new THREE.AnimationClip(isSwan ? 'Swan_FrontDance' : 'Lake_Shanshen', 2.4, tracks);
    }

    // Procedural front-facing cute NCHU chibi player (facing +Z directly at the camera).
    function buildHumanPortraitModel(THREE) {
        const root = new THREE.Group();

        // Friendly smiling face texture oriented toward +Z (front camera).
        const fc = document.createElement('canvas');
        fc.width = 256; fc.height = 256;
        const ctx = fc.getContext('2d');
        ctx.fillStyle = '#fde2c4'; ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#3b2416';
        ctx.beginPath(); ctx.arc(102, 122, 10, 0, Math.PI * 2); ctx.arc(154, 122, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(105, 118, 3.5, 0, Math.PI * 2); ctx.arc(157, 118, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(244, 114, 182, 0.42)';
        ctx.beginPath(); ctx.ellipse(84, 144, 15, 9, 0, 0, Math.PI * 2); ctx.ellipse(172, 144, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6b3a24'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(128, 142, 18, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
        const faceTex = new THREE.CanvasTexture(fc);
        faceTex.encoding = THREE.sRGBEncoding;

        const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde2c4, roughness: 0.7 });
        const poloMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.55 });
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.5 });
        const shortMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7 });
        const capMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.48 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });

        const body = new THREE.Group();
        root.add(body);

        // Legs
        const legL = new THREE.Group(); legL.position.set(-0.14, 0.48, 0);
        const legR = new THREE.Group(); legR.position.set(0.14, 0.48, 0);
        const legGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.42, 14);
        const shoeGeo = new THREE.BoxGeometry(0.14, 0.09, 0.22);
        const mLegL = new THREE.Mesh(legGeo, shortMat); mLegL.position.y = -0.18; legL.add(mLegL);
        const mShoeL = new THREE.Mesh(shoeGeo, shoeMat); mShoeL.position.set(0, -0.42, 0.04); legL.add(mShoeL);
        const mLegR = new THREE.Mesh(legGeo, shortMat); mLegR.position.y = -0.18; legR.add(mLegR);
        const mShoeR = new THREE.Mesh(shoeGeo, shoeMat); mShoeR.position.set(0, -0.42, 0.04); legR.add(mShoeR);
        body.add(legL, legR);

        // Torso + collar
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.58, 18), poloMat);
        torso.position.y = 0.76; body.add(torso);
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.036, 10, 20), whiteMat);
        collar.rotation.x = Math.PI / 2; collar.position.y = 1.05; body.add(collar);

        // Head + face facing +Z
        const head = new THREE.Group(); head.position.set(0, 1.32, 0);
        const headMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.27, 24, 24),
            new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.65 })
        );
        headMesh.rotation.y = -Math.PI / 2; // Align canvas center with +Z front camera
        head.add(headMesh);
        const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.285, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), capMat);
        capDome.position.y = 0.03; head.add(capDome);
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.32, 0.035, 20, 1, false, -0.85, 1.7), capMat);
        brim.position.set(0, 0.05, 0.14); brim.rotation.x = 0.14; head.add(brim);
        body.add(head);

        // Left arm (waves cheerfully at camera!)
        const armL = new THREE.Group(); armL.position.set(-0.29, 0.98, 0);
        const armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.42, 12), skinMat);
        armLMesh.position.y = -0.18; armL.add(armLMesh);
        const handL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), skinMat);
        handL.position.y = -0.4; armL.add(handL);
        body.add(armL);

        // Right arm + cute N-GO paddle facing camera
        const armR = new THREE.Group(); armR.position.set(0.29, 0.98, 0);
        const armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.058, 0.42, 12), skinMat);
        armRMesh.position.y = -0.18; armR.add(armRMesh);
        const paddle = new THREE.Group();
        paddle.position.set(0.04, -0.42, 0.08);
        paddle.rotation.set(-0.35, 0.25, -0.25);
        const pGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.15, 10), new THREE.MeshStandardMaterial({ color: 0x234b3b, roughness: 0.8 }));
        const pFace = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.30, 0.028), new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 }));
        pFace.position.y = 0.21;
        const pRim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.02), new THREE.MeshStandardMaterial({ color: 0x234b3b, roughness: 0.6 }));
        pRim.position.y = 0.21;
        paddle.add(pGrip, pRim, pFace);
        armR.add(paddle);
        body.add(armR);

        root.userData.humanParts = { body, head, armL, armR, legL, legR };
        return root;
    }

    class CharacterPortrait {
        constructor(container, options = {}) {
            this.container = container;
            this.dance = !!options.dance;
            this.character = ['human', 'goose', 'swan'].includes(options.character)
                ? options.character
                : ((typeof window.playerCharacter === 'string' && ['human', 'goose', 'swan'].includes(window.playerCharacter)) ? window.playerCharacter : 'goose');
            this.destroyed = false;
            this.listeners = [];
            // Default yaw faces the front camera so players always see the cute face.
            this.yaw = this.dance ? 0.0 : 0.08;
            this.time = 0;
            this.last = 0;
            this.frame = 0;
            this.cheerTimer = 0;
            const loadNames = { human: '興大球員', goose: '匹克鵝', swan: '黑天鵝' };
            this.container.textContent = (loadNames[this.character] || '角色') + '準備中…';
            this.ready = this.init();
        }
        triggerCheer() {
            this.cheerTimer = 1.15;
        }
        async init() {
            const THREE = window.THREE;
            try {
                if (!THREE) throw new Error('3D 套件尚未就緒');
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(32, 1, .05, 20);
                this.camera.position.set(0, 1.05, 4.45);
                this.camera.lookAt(0, 1.02, 0);
                this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                this.renderer.outputEncoding = THREE.sRGBEncoding;

                if (this.character === 'human') {
                    this.root = buildHumanPortraitModel(THREE);
                } else {
                    if (!THREE.GLTFLoader) throw new Error('3D 套件尚未就緒');
                    const bytes = await modelBytes(this.character);
                    const gltf = await new Promise((resolve, reject) => new THREE.GLTFLoader().parse(bytes, '', resolve, reject));
                    if (this.destroyed) { disposePortraitModel(gltf.scene); return; }
                    this.root = gltf.scene;
                    this.gltfAnimations = gltf.animations || [];
                }

                if (this.destroyed) { disposePortraitModel(this.root); this.renderer.dispose(); return; }

                this.container.textContent = '';
                this.container.appendChild(this.renderer.domElement);
                const labelMap = { human: '興大球員正面動畫', goose: '匹克鵝正面閃身步', swan: '黑天鵝正面展翅舞' };
                this.renderer.domElement.setAttribute('aria-label', labelMap[this.character] || '3D 角色正面展示');
                this.scene.add(new THREE.HemisphereLight(0xfffaf0, 0x728769, 1.3));
                const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
                keyLight.position.set(1.8, 3.8, 4.5); this.scene.add(keyLight);
                const rimLight = new THREE.DirectionalLight(0xfff3d6, 0.45);
                rimLight.position.set(-2.5, 2.5, -2); this.scene.add(rimLight);

                this.root.updateMatrixWorld(true);
                const box = new THREE.Box3().setFromObject(this.root);
                this.root.scale.setScalar(2.02 / Math.max(0.1, box.getSize(new THREE.Vector3()).y));
                this.root.updateMatrixWorld(true);
                box.setFromObject(this.root);
                const center = box.getCenter(new THREE.Vector3());
                this.root.position.set(-center.x, -box.min.y, -center.z);
                this.baseX = this.root.position.x;
                this.baseY = this.root.position.y;
                this.root.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
                this.scene.add(this.root);

                if (this.character !== 'human') {
                    this.mixer = new THREE.AnimationMixer(this.root);
                    const clip = frontDanceClip(this.root, this.character);
                    if (clip && clip.tracks.length) {
                        this.mixer.clipAction(clip).play();
                    } else if (this.gltfAnimations && this.gltfAnimations.length) {
                        const fallback = this.gltfAnimations.find(c => c.name === 'Idle') || this.gltfAnimations[0];
                        if (fallback) this.mixer.clipAction(fallback).play();
                    }
                }

                this.resizeObserver = new ResizeObserver(() => this.resize());
                this.resizeObserver.observe(this.container); this.resize();
                if (!this.dance) this.bindDrag();
                this.tick = this.tick.bind(this); this.frame = requestAnimationFrame(this.tick);
            } catch (e) {
                if (!this.destroyed) this.container.textContent = '角色暫時未載入，請稍後重開。';
                console.warn('Character portrait:', e.message);
            }
        }
        resize() {
            if (!this.renderer) return;
            const width = this.container.clientWidth || 170, height = this.container.clientHeight || 220;
            this.renderer.setSize(width, height, false);
            this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
        }
        bindDrag() {
            const canvas = this.renderer.domElement;
            let start = null;
            canvas.style.touchAction = 'pan-y';
            const on = (event, fn) => { canvas.addEventListener(event, fn); this.listeners.push([event, fn]); };
            on('pointerdown', e => { start = e.clientX; canvas.setPointerCapture(e.pointerId); });
            on('pointermove', e => { if (start !== null) { this.yaw += (e.clientX - start) * .015; start = e.clientX; } });
            on('pointerup', () => { start = null; });
            on('pointercancel', () => { start = null; });
        }
        tick(now) {
            if (this.destroyed) return;
            this.frame = requestAnimationFrame(this.tick);
            if (document.hidden || now - this.last < 33) return;
            const dt = this.last ? Math.min(.1, (now - this.last) / 1000) : 0;
            this.last = now; this.time += dt;
            if (this.cheerTimer > 0) this.cheerTimer = Math.max(0, this.cheerTimer - dt);

            if (this.mixer) this.mixer.update(dt);

            // Human procedural front-facing wave & bounce animation
            const hp = this.root && this.root.userData && this.root.userData.humanParts;
            if (hp) {
                const waveSpeed = this.cheerTimer > 0 ? 14 : 5.5;
                hp.armL.rotation.z = -2.45 + Math.sin(this.time * waveSpeed) * 0.42;
                hp.armR.rotation.z = 0.25 + Math.sin(this.time * 4.2) * 0.16;
                hp.armR.rotation.x = -0.3 + Math.cos(this.time * 4.2) * 0.18;
                hp.head.rotation.z = Math.sin(this.time * 2.8) * 0.08;
                hp.head.rotation.y = Math.sin(this.time * 1.9) * 0.12;
                hp.legL.rotation.x = Math.sin(this.time * 5.2) * 0.16;
                hp.legR.rotation.x = -Math.sin(this.time * 5.2) * 0.16;
            }

            const cheerBounce = this.cheerTimer > 0 ? Math.abs(Math.sin(this.cheerTimer * Math.PI * 3.5)) * 0.26 : 0;
            const idleBounce = this.dance ? Math.abs(Math.sin(this.time * Math.PI / 0.6)) * 0.055 : Math.abs(Math.sin(this.time * 2.4)) * 0.025;
            // Stay facing front (±0.22 rad gentle sway) so the front face is always clearly visible
            const frontSway = this.dance
                ? Math.sin(this.time * Math.PI / 1.25) * 0.22
                : Math.sin(this.time * 1.4) * 0.12;
            this.root.rotation.y = this.yaw + frontSway;
            this.root.position.x = this.baseX + (this.dance ? Math.sin(this.time * Math.PI / 0.65) * 0.08 : 0);
            this.root.position.y = this.baseY + idleBounce + cheerBounce;
            this.renderer.render(this.scene, this.camera);
        }
        destroy() {
            this.destroyed = true; cancelAnimationFrame(this.frame);
            if (this.resizeObserver) this.resizeObserver.disconnect();
            if (this.mixer) { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); }
            if (this.root) disposePortraitModel(this.root);
            if (this.renderer) {
                for (const [event, fn] of this.listeners) this.renderer.domElement.removeEventListener(event, fn);
                this.renderer.dispose(); this.renderer.forceContextLoss(); this.renderer.domElement.remove();
            }
        }
    }
    window.NGoCharacterPortrait = CharacterPortrait;
})(window);
