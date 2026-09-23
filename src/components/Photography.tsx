import { useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Camera, X, Calendar, Image as ImageIcon, RefreshCw } from "lucide-react";
import { PhotographyGallery, getPhotographyGalleries } from "../utils/contentLoader";
import { useFocusTrap } from "../utils/useShareableModal";
import { getCardMotionProps } from "../utils/motion";

interface PhotographyProps {
  galleries?: PhotographyGallery[];
  loading?: boolean;
  error?: string | null;
  retry?: () => void;
  activeGallery: PhotographyGallery | null;
  onOpenGallery: (id: string, triggerEl?: HTMLElement | null) => void;
  onCloseGallery: () => void;
}

export function Photography({
  galleries: propGalleries,
  loading = false,
  error = null,
  retry,
  activeGallery,
  onOpenGallery,
  onCloseGallery,
}: PhotographyProps) {
  const shouldReduceMotion = useReducedMotion();
  const galleries = propGalleries !== undefined ? propGalleries : getPhotographyGalleries();
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(Boolean(activeGallery), modalRef);

  return (
    <section id="photography" className="py-24 bg-slate-900/50 border-y border-white/5 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono mb-3">
            <Camera size={12} className="text-purple-400" />
            VISUAL STORYTELLING
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-semibold text-white">
            Photography & Visual Stories
          </h2>
          <div className="w-12 h-1 bg-purple-500 rounded-full mt-4 mb-4"></div>
          <p className="text-slate-400 max-w-2xl text-base md:text-lg">
            Capturing rural history, automotive culture, community impact, and natural light through the lens.
          </p>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading photography galleries">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-slate-850 animate-pulse border border-white/5 flex flex-col justify-end p-6 bg-slate-800/60"
              >
                <div className="h-3 bg-slate-700/60 rounded w-20 mb-3" />
                <div className="h-6 bg-slate-700/60 rounded w-3/4 mb-3" />
                <div className="h-3 bg-slate-700/60 rounded w-full mb-2" />
                <div className="h-3 bg-slate-700/60 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && galleries.length === 0 && (
          <div className="glass-panel p-8 text-center max-w-lg mx-auto border-red-500/20 bg-red-500/5 my-8">
            <p className="text-slate-300 text-sm mb-4">{error}</p>
            {retry && (
              <button
                onClick={retry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500 hover:bg-purple-400 text-white text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <RefreshCw size={14} />
                Retry Loading
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && galleries.length === 0 && (
          <div className="glass-panel p-12 text-center max-w-lg mx-auto border border-white/10 my-8">
            <Camera size={28} className="text-slate-500 mx-auto mb-3" />
            <h3 className="text-lg font-display font-semibold text-white mb-1">No Galleries Found</h3>
            <p className="text-sm text-slate-400">Published photography collections will appear here.</p>
          </div>
        )}

        {/* Galleries Grid */}
        {!loading && galleries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery, index) => (
              <motion.div
                key={gallery.id}
                {...getCardMotionProps(index, Boolean(shouldReduceMotion))}
                tabIndex={0}
                role="button"
                aria-haspopup="dialog"
                onClick={(e) => onOpenGallery(gallery.id, e.currentTarget)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenGallery(gallery.id, e.currentTarget);
                  }
                }}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-slate-800 cursor-pointer border border-white/10 hover:border-purple-500/40 focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all duration-500 shadow-lg"
              >
                {/* Cover Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${gallery.coverImage}), linear-gradient(to bottom right, #1e293b, #0f172a)`
                  }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-85 group-hover:opacity-75 transition-opacity" />

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <div className="flex items-center gap-2 text-xs font-mono text-purple-300 mb-2">
                    <ImageIcon size={14} />
                    <span>{gallery.images.length} {gallery.images.length === 1 ? 'Photo' : 'Photos'}</span>
                  </div>

                  <h3 className="text-xl font-display font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                    {gallery.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                    {gallery.description}
                  </p>

                  <div className="w-8 h-0.5 bg-purple-500 opacity-60 group-hover:w-16 group-hover:opacity-100 transition-all duration-300"></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Gallery Viewer Dialog */}
      <AnimatePresence>
        {activeGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6" role="presentation">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseGallery}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
              aria-hidden="true"
            />

            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="gallery-modal-title"
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-panel p-6 md:p-10 bg-slate-900/95 border border-white/10 shadow-2xl z-10 custom-scrollbar focus:outline-none"
            >
              <button
                onClick={onCloseGallery}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                aria-label="Close gallery dialog"
              >
                <X size={20} />
              </button>

              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 text-xs font-mono text-purple-400 mb-3">
                  <span className="px-2.5 py-1 bg-purple-500/10 rounded-md border border-purple-500/20 uppercase tracking-wider font-semibold">
                    Gallery
                  </span>
                  {activeGallery.date && (
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={14} />
                      {activeGallery.date}
                    </span>
                  )}
                  <span className="text-slate-400">
                    • {activeGallery.images.length} {activeGallery.images.length === 1 ? 'image' : 'images'}
                  </span>
                </div>

                <h2 id="gallery-modal-title" className="text-2xl md:text-4xl font-display font-semibold text-white leading-tight mb-4">
                  {activeGallery.title}
                </h2>

                <p className="text-slate-300 leading-relaxed text-base mb-10">
                  {activeGallery.description}
                </p>

                {/* Photos List */}
                <div className="space-y-12">
                  {activeGallery.images.map((image, idx) => (
                    <figure key={idx} className="space-y-3">
                      <div className="rounded-xl overflow-hidden bg-slate-950 border border-white/10 shadow-lg">
                        <img
                          src={image.src}
                          srcSet={image.srcSet || undefined}
                          sizes={image.sizes || undefined}
                          alt={image.alt}
                          loading="lazy"
                          className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                        />
                      </div>
                      {image.caption && (
                        <figcaption className="text-sm text-slate-400 italic text-center px-4">
                          {image.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-mono text-slate-500">
                    Photography by Jim Lucke
                  </span>
                  <button
                    onClick={onCloseGallery}
                    className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/5 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    Close Gallery
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
