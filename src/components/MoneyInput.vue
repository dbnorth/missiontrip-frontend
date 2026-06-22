<script setup>
import { ref, watch, computed } from "vue";
import { formatMoneyDisplay, parseMoneyInput, parseMoneyAmount, moneyRule } from "../utils/moneyUtils.js";

const props = defineProps({
  modelValue: { type: [String, Number], default: "" },
  label: { type: String, default: "Amount" },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  density: { type: String, default: "compact" },
  hideDetails: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const focused = ref(false);
const editText = ref("");

const syncEditTextFromModel = () => {
  editText.value = props.modelValue != null && props.modelValue !== ""
    ? parseMoneyInput(String(props.modelValue))
    : "";
};

watch(
  () => props.modelValue,
  () => {
    if (!focused.value) syncEditTextFromModel();
  },
  { immediate: true }
);

const displayValue = computed(() => {
  if (focused.value) return editText.value;
  if (props.modelValue == null || props.modelValue === "") return "";
  return formatMoneyDisplay(props.modelValue);
});

const rules = computed(() => {
  if (props.disabled || props.readonly) return [];
  const r = [(v) => moneyRule(focused.value ? editText.value : v)];
  if (props.required) {
    r.unshift(() => {
      const amount = parseMoneyAmount(focused.value ? editText.value : props.modelValue);
      return amount != null && amount > 0 ? true : "Amount is required";
    });
  }
  return r;
});

const onFocus = () => {
  focused.value = true;
  syncEditTextFromModel();
};

const onBlur = () => {
  focused.value = false;
  const parsed = parseMoneyInput(editText.value);
  editText.value = parsed;
  emit("update:modelValue", parsed);
};

const onInput = (v) => {
  editText.value = parseMoneyInput(v);
  emit("update:modelValue", editText.value);
};
</script>

<template>
  <v-text-field
    :model-value="displayValue"
    :label="label"
    type="text"
    inputmode="decimal"
    :prefix="focused ? '$' : undefined"
    :readonly="readonly"
    :disabled="disabled"
    :density="density"
    :hide-details="hideDetails"
    :rules="readonly || disabled ? [] : rules"
    placeholder="0.00"
    autocomplete="off"
    class="money-input"
    @focus="onFocus"
    @blur="onBlur"
    @update:model-value="onInput"
  />
</template>

<style scoped>
.money-input :deep(input[type="text"]) {
  -moz-appearance: textfield;
}

.money-input :deep(input::-webkit-outer-spin-button),
.money-input :deep(input::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
</style>
