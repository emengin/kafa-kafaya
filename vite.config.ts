/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

/**
 * GitHub Pages projeyi https://<kullanıcı>.github.io/<depo>/ altında yayınlar.
 * Actions içinde GITHUB_REPOSITORY="sahip/depo" tanımlıdır; yerelde varsayılan depo adı kullanılır.
 */
const DEFAULT_REPO_NAME = 'kafa-kafaya';
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? DEFAULT_REPO_NAME;

/** Phaser tek başına ~1.2 MB; Vite'ın 500 kB uyarısını anlamlı bir sınıra çekiyoruz. */
const CHUNK_SIZE_WARNING_KB = 1600;

// `vite preview` da command === 'serve' ile çalışır; derlenmiş dosyalar depo alt yolunu
// beklediği için önizlemede de aynı base kullanılmalı (yoksa varlıklar 404 verir).
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview === true ? `/${repoName}/` : '/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: CHUNK_SIZE_WARNING_KB,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
