import React from 'react';
import { Award, Briefcase, CheckCircle2, Info, ShieldAlert, Target, Wrench } from 'lucide-react';
import type { Gap, GapAnalysis, GapCategory, GapSeverity } from '../types';

interface GapAnalysisPanelProps {
  gapAnalysis: GapAnalysis | null | undefined;
}

const CATEGORY_META: Record<GapCategory, { label: string; icon: React.ElementType }> = {
  experience: { label: 'Experience', icon: Briefcase },
  skill: { label: 'Skill', icon: Wrench },
  certification: { label: 'Certification', icon: Award },
};

function scoreStyles(score: number): { ring: string; text: string; bg: string } {
  if (score >= 80) return { ring: 'stroke-green-600', text: 'text-green-700', bg: 'bg-green-100 border-green-200' };
  if (score >= 50) return { ring: 'stroke-amber-600', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
  return { ring: 'stroke-red-600', text: 'text-red-700', bg: 'bg-red-50 border-red-200' };
}

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const styles = scoreStyles(score);

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg viewBox="0 0 72 72" className="w-20 h-20 -rotate-90">
        <circle cx="36" cy="36" r={radius} className="stroke-slate-100" strokeWidth="8" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className={`${styles.ring} transition-all duration-700`}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${styles.text}`}>{score}</span>
      </div>
    </div>
  );
};

const GapCard: React.FC<{ gap: Gap }> = ({ gap }) => {
  const meta = CATEGORY_META[gap.category];
  const Icon = meta.icon;
  const isBlocking = gap.severity === 'blocking';

  return (
    <div
      className={`p-3.5 rounded-xl border text-sm ${
        isBlocking ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-start space-x-2.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isBlocking ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{meta.label}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                isBlocking ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              {gap.severity}
            </span>
          </div>
          <p className="mt-1 font-semibold text-slate-900 break-words">{gap.requirement}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            <span className="font-medium">You have:</span> {gap.candidate_has}
          </p>
          <p className="mt-1.5 text-xs text-slate-700 leading-relaxed">{gap.recommendation}</p>
        </div>
      </div>
    </div>
  );
};

const SKILL_GROUP_META: Record<GapSeverity, { label: string; chip: string }> = {
  blocking: { label: 'Major', chip: 'bg-red-100 text-red-800 border-red-200' },
  minor: { label: 'Minor', chip: 'bg-amber-100 text-amber-800 border-amber-200' },
};

/**
 * Missing skills, just identified and grouped as Major (blocking) or Minor -- no per-skill
 * "add this to your profile" recommendation repeated for each one.
 */
const SkillGapGroup: React.FC<{ severity: GapSeverity; skills: Gap[] }> = ({ severity, skills }) => {
  if (skills.length === 0) return null;
  const meta = SKILL_GROUP_META[severity];

  return (
    <div className="flex items-start space-x-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 shrink-0 pt-1">
        {meta.label}:
      </span>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((gap, i) => (
          <span
            key={i}
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.chip}`}
          >
            {gap.requirement}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Shows how the tailored application stacks up against the job's stated requirements:
 * an overall match score plus concrete gaps grouped by severity. Every gap here comes
 * straight from the backend's evidence-grounded comparison (services/gap_analysis.py) --
 * this component only renders what it's given, it never computes or guesses anything.
 */
export const GapAnalysisPanel: React.FC<GapAnalysisPanelProps> = ({ gapAnalysis }) => {
  if (!gapAnalysis) return null;

  const { score, gaps, matched_count, total_count, note } = gapAnalysis;
  const skillGaps = gaps.filter((g) => g.category === 'skill');
  const otherGaps = gaps.filter((g) => g.category !== 'skill');
  const blockingGaps = otherGaps.filter((g) => g.severity === 'blocking');
  const minorGaps = otherGaps.filter((g) => g.severity === 'minor');

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center space-x-2">
        <Target className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-900">Gap Analysis</h3>
      </div>

      <div className="p-5 space-y-5">
        {score === null || score === undefined ? (
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-slate-600">
              {note || 'No concrete, checkable requirements were found in this job description.'}
            </p>
          </div>
        ) : (
          <div className="flex items-center space-x-4">
            <ScoreRing score={score} />
            <div>
              <p className="text-sm font-semibold text-slate-900">ATS Match Score</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {matched_count} of {total_count} requirement{total_count === 1 ? '' : 's'} met
              </p>
            </div>
          </div>
        )}

        {score !== null && score !== undefined && gaps.length === 0 && (
          <div className="flex items-center space-x-2.5 p-3.5 rounded-xl bg-green-100 border border-green-200 text-sm text-green-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>No gaps found against this job's stated requirements.</span>
          </div>
        )}

        {skillGaps.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Missing Skills ({skillGaps.length})
              </h4>
            </div>
            <SkillGapGroup severity="blocking" skills={skillGaps.filter((g) => g.severity === 'blocking')} />
            <SkillGapGroup severity="minor" skills={skillGaps.filter((g) => g.severity === 'minor')} />
          </div>
        )}

        {blockingGaps.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-red-700">
                Blocking Gaps ({blockingGaps.length})
              </h4>
            </div>
            {blockingGaps.map((gap, i) => (
              <GapCard key={`blocking-${i}`} gap={gap} />
            ))}
          </div>
        )}

        {minorGaps.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Minor Gaps ({minorGaps.length})
              </h4>
            </div>
            {minorGaps.map((gap, i) => (
              <GapCard key={`minor-${i}`} gap={gap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
