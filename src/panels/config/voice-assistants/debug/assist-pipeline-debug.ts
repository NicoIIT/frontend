import {
  mdiMicrophoneMessage,
  mdiRayEndArrow,
  mdiRayStartArrow,
} from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { formatDateTimeWithSeconds } from "../../../../common/datetime/format_date_time";
import {
  listAssistPipelineRuns,
  getAssistPipelineRun,
  PipelineRunEvent,
  assistRunListing,
} from "../../../../data/assist_pipeline";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import "../../../../layouts/hass-subpage";
import { haStyle } from "../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../types";
import "./assist-render-pipeline-events";

@customElement("assist-pipeline-debug")
export class AssistPipelineDebug extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property() public pipelineId!: string;

  @state() private _runId?: string;

  @state() private _runs?: assistRunListing[];

  @state() private _events?: PipelineRunEvent[];

  protected render() {
    return html`<hass-subpage
      .narrow=${this.narrow}
      .hass=${this.hass}
      header="Debug Assistant"
    >
      <a
        href="/config/voice-assistants/debug?pipeline=${this.pipelineId}"
        slot="toolbar-icon"
        ><ha-icon-button .path=${mdiMicrophoneMessage}></ha-icon-button
      ></a>
      <div class="toolbar">
        ${this._runs?.length
          ? html`
              <ha-icon-button
                .disabled=${this._runs[this._runs.length - 1]
                  .pipeline_run_id === this._runId}
                label="Older run"
                @click=${this._pickOlderRun}
                .path=${mdiRayEndArrow}
              ></ha-icon-button>
              <select .value=${this._runId} @change=${this._pickRun}>
                ${repeat(
                  this._runs,
                  (run) => run.pipeline_run_id,
                  (run) =>
                    html`<option value=${run.pipeline_run_id}>
                      ${formatDateTimeWithSeconds(
                        new Date(run.timestamp),
                        this.hass.locale,
                        this.hass.config
                      )}
                    </option>`
                )}
              </select>
              <ha-icon-button
                .disabled=${this._runs[0].pipeline_run_id === this._runId}
                label="Newer run"
                @click=${this._pickNewerRun}
                .path=${mdiRayStartArrow}
              ></ha-icon-button>
            `
          : ""}
      </div>
      ${this._runs?.length === 0
        ? html`<div class="container">No runs found</div>`
        : ""}
      <div class="content">
        ${this._events
          ? html`<assist-render-pipeline-events
              .hass=${this.hass}
              .events=${this._events}
            ></assist-render-pipeline-events>`
          : ""}
      </div>
    </hass-subpage>`;
  }

  protected willUpdate(changedProperties) {
    if (changedProperties.has("pipelineId")) {
      this._fetchRuns();
    }
    if (changedProperties.has("_runId")) {
      this._fetchEvents();
    }
  }

  private async _fetchRuns() {
    if (!this.pipelineId) {
      this._runs = undefined;
      return;
    }
    try {
      this._runs = (
        await listAssistPipelineRuns(this.hass, this.pipelineId)
      ).pipeline_runs.reverse();
    } catch (e: any) {
      showAlertDialog(this, {
        title: "Failed to fetch pipeline runs",
        text: e.message,
      });
      return;
    }
    if (!this._runs.length) {
      return;
    }
    if (
      !this._runId ||
      !this._runs.find((run) => run.pipeline_run_id === this._runId)
    ) {
      this._runId = this._runs[0].pipeline_run_id;
      this._fetchEvents();
    }
  }

  private async _fetchEvents() {
    if (!this._runId) {
      this._events = undefined;
      return;
    }
    try {
      this._events = (
        await getAssistPipelineRun(this.hass, this.pipelineId, this._runId)
      ).events;
    } catch (e: any) {
      showAlertDialog(this, {
        title: "Failed to fetch events",
        text: e.message,
      });
    }
  }

  private _pickOlderRun() {
    const curIndex = this._runs!.findIndex(
      (run) => run.pipeline_run_id === this._runId
    );
    this._runId = this._runs![curIndex + 1].pipeline_run_id;
  }

  private _pickNewerRun() {
    const curIndex = this._runs!.findIndex(
      (run) => run.pipeline_run_id === this._runId
    );
    this._runId = this._runs![curIndex - 1].pipeline_run_id;
  }

  private _pickRun(ev) {
    this._runId = ev.target.value;
  }

  static styles = [
    haStyle,
    css`
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: center;
        height: var(--header-height);
        background-color: var(--primary-background-color);
        color: var(--app-header-text-color, white);
        border-bottom: var(--app-header-border-bottom, none);
        box-sizing: border-box;
      }
      .content {
        padding: 24px 0 32px;
        max-width: 600px;
        margin: 0 auto;
        direction: ltr;
      }
      .container {
        padding: 16px;
      }
      assist-render-pipeline-run {
        padding-top: 16px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "assist-pipeline-debug": AssistPipelineDebug;
  }
}
